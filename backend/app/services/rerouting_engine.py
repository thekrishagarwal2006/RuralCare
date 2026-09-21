from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.models import (
    Referral, Hospital, HospitalResource, ReferralRequirement,
    Ambulance, ReroutingDecision, RerouteDecisionEnum, ReferralStatus
)
from app.services.geo_service import haversine_distance_km, estimate_eta_minutes
from app.services.prediction_service import resource_predictor
from app.services.audit_service import log_referral_event
from app.websocket.connection_manager import ws_manager

async def evaluate_rerouting(
    db: Session,
    referral_id: str,
    trigger_resource_event_id: Optional[str] = None,
    current_lat: Optional[float] = None,
    current_lon: Optional[float] = None
) -> Dict[str, Any]:
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral or not referral.assigned_hospital_id:
        return {"error": "Referral or assigned hospital not found"}

    reqs = referral.requirements
    curr_hosp = db.query(Hospital).filter(Hospital.id == referral.assigned_hospital_id).first()
    curr_res = curr_hosp.resources

    # 1. Determine Ambulance Location
    amb_lat, amb_lon = None, None
    if current_lat is not None and current_lon is not None:
        amb_lat, amb_lon = current_lat, current_lon
    elif referral.assigned_ambulance_id:
        amb = db.query(Ambulance).filter(Ambulance.id == referral.assigned_ambulance_id).first()
        if amb:
            amb_lat, amb_lon = amb.current_latitude, amb.current_longitude

    if amb_lat is None or amb_lon is None:
        # Fall back to PHC location if ambulance location not available
        amb_lat, amb_lon = referral.phc.latitude, referral.phc.longitude

    # 2. Calculate current hospital ETA & resource check
    curr_dist = haversine_distance_km(amb_lat, amb_lon, curr_hosp.latitude, curr_hosp.longitude)
    curr_eta = estimate_eta_minutes(curr_dist)

    # Check requirement depletion at current hospital
    icu_depleted = reqs.requires_icu and curr_res.icu_available <= 0
    vent_depleted = reqs.requires_ventilator and curr_res.ventilators_available <= 0
    oxy_depleted = reqs.requires_oxygen and not curr_res.oxygen_available

    is_current_unsuitable = icu_depleted or vent_depleted or oxy_depleted

    if not is_current_unsuitable:
        # Current hospital is still capable
        decision = RerouteDecisionEnum.CONTINUE
        reason = f"Current destination hospital ({curr_hosp.name}) maintains all required resources. ETA: {curr_eta} min."
        rec_hosp = curr_hosp
        rec_eta = curr_eta
    else:
        # Check prediction model for current hospital
        pred = resource_predictor.predict_resource_availability(
            hospital_id=curr_hosp.id,
            resource_type="ICU" if reqs.requires_icu else "General",
            current_available=0,
            arrival_eta_minutes=curr_eta
        )

        # Query alternative hospitals
        all_hospitals = db.query(Hospital).filter(
            Hospital.is_active == True,
            Hospital.id != curr_hosp.id
        ).all()

        candidate_evals = []
        for cand in all_hospitals:
            cand_res = cand.resources
            # Filter suitability
            c_icu_ok = not reqs.requires_icu or cand_res.icu_available > 0
            c_vent_ok = not reqs.requires_ventilator or cand_res.ventilators_available > 0
            c_oxy_ok = not reqs.requires_oxygen or cand_res.oxygen_available

            if c_icu_ok and c_vent_ok and c_oxy_ok:
                dist = haversine_distance_km(amb_lat, amb_lon, cand.latitude, cand.longitude)
                eta = estimate_eta_minutes(dist)
                candidate_evals.append({
                    "hospital": cand,
                    "distance_km": dist,
                    "eta": eta
                })

        candidate_evals.sort(key=lambda x: x["eta"])

        # Decide WAIT_AND_STABILIZE vs REROUTE
        if pred["is_predicted_available"] and pred["expected_available_time_minutes"] <= (curr_eta + 5):
            # Resource predicted to be freed before or right at arrival
            decision = RerouteDecisionEnum.WAIT_AND_STABILIZE
            reason = (f"Required resource at current hospital ({curr_hosp.name}) is predicted to become available "
                      f"in ~{pred['expected_available_time_minutes']} min near estimated arrival ({curr_eta} min). "
                      f"Stabilize patient in transit.")
            rec_hosp = curr_hosp
            rec_eta = curr_eta
        elif candidate_evals:
            best_cand = candidate_evals[0]
            decision = RerouteDecisionEnum.REROUTE
            eta_delta = best_cand["eta"] - curr_eta
            reason = (f"Destination hospital ({curr_hosp.name}) lacks required resources. "
                      f"Alternative hospital ({best_cand['hospital'].name}) satisfies all requirements with "
                      f"ETA {best_cand['eta']} min ({'+' if eta_delta >= 0 else ''}{eta_delta} min difference).")
            rec_hosp = best_cand["hospital"]
            rec_eta = best_cand["eta"]
        else:
            decision = RerouteDecisionEnum.WAIT_AND_STABILIZE
            reason = f"No alternative hospital with available resources found in immediate region. Continue to {curr_hosp.name} under emergency stabilization."
            rec_hosp = curr_hosp
            rec_eta = curr_eta

    # Update Referral Status if risk detected
    if is_current_unsuitable and referral.status in [ReferralStatus.ACCEPTED, ReferralStatus.IN_TRANSIT]:
        referral.status = ReferralStatus.AT_RISK
        db.commit()

    # Save Rerouting Decision Entry
    reroute_rec = ReroutingDecision(
        referral_id=referral.id,
        trigger_resource_event_id=trigger_resource_event_id,
        current_hospital_id=curr_hosp.id,
        recommended_hospital_id=rec_hosp.id if rec_hosp else None,
        decision=decision,
        reason=reason,
        current_hospital_eta=curr_eta,
        recommended_hospital_eta=rec_eta
    )
    db.add(reroute_rec)
    db.commit()

    log_referral_event(
        db=db,
        referral_id=referral.id,
        event_type="REROUTING_EVALUATED",
        description=f"Decision: {decision.value}. Rationale: {reason}"
    )

    result = {
        "referral_id": referral.id,
        "referral_code": referral.referral_code,
        "decision": decision.value,
        "reason": reason,
        "current_hospital_id": curr_hosp.id,
        "current_hospital_name": curr_hosp.name,
        "current_hospital_eta": curr_eta,
        "recommended_hospital_id": rec_hosp.id if rec_hosp else None,
        "recommended_hospital_name": rec_hosp.name if rec_hosp else None,
        "recommended_hospital_eta": rec_eta,
        "status": referral.status.value
    }

    # Publish WebSocket Event
    if decision != RerouteDecisionEnum.CONTINUE:
        if referral.assigned_ambulance_id:
            await ws_manager.publish_event(
                channel=f"ambulance/{referral.assigned_ambulance_id}",
                event_type="REROUTE_RECOMMENDED",
                data=result
            )
        await ws_manager.publish_event(
            channel="command-center",
            event_type="REROUTE_RECOMMENDED",
            data=result
        )

    return result

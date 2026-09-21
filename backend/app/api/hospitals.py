from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Hospital, HospitalResource, HospitalResourceEvent, Referral, ReferralStatus
)
from app.schemas.schemas import HospitalOut, HospitalResourceOut, ResourceUpdate
from app.websocket.connection_manager import ws_manager
from app.services.rerouting_engine import evaluate_rerouting
from app.services.audit_service import log_referral_event

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

@router.get("", response_model=List[HospitalOut])
def get_hospitals(db: Session = Depends(get_db)):
    return db.query(Hospital).filter(Hospital.is_active == True).all()

@router.get("/{id}", response_model=HospitalOut)
def get_hospital(id: str, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hosp

@router.get("/{id}/resources", response_model=HospitalResourceOut)
def get_hospital_resources(id: str, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == id).first()
    if not hosp or not hosp.resources:
        raise HTTPException(status_code=404, detail="Hospital resources not found")
    return hosp.resources

@router.put("/{id}/resources", response_model=HospitalResourceOut)
async def update_hospital_resources(
    id: str,
    update: ResourceUpdate,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == id).first()
    if not hosp or not hosp.resources:
        raise HTTPException(status_code=404, detail="Hospital resources not found")

    res = hosp.resources
    changes = []

    # ICU Bed update
    if update.icu_occupied is not None and update.icu_occupied != res.icu_occupied:
        prev_val = res.icu_occupied
        res.icu_occupied = update.icu_occupied
        event = HospitalResourceEvent(
            hospital_id=id,
            resource_name="icu_occupied",
            previous_value=prev_val,
            new_value=res.icu_occupied
        )
        db.add(event)
        changes.append(("ICU Occupied", prev_val, res.icu_occupied, res.icu_available))

    # General Bed update
    if update.general_beds_occupied is not None and update.general_beds_occupied != res.general_beds_occupied:
        prev_val = res.general_beds_occupied
        res.general_beds_occupied = update.general_beds_occupied
        event = HospitalResourceEvent(
            hospital_id=id,
            resource_name="general_beds_occupied",
            previous_value=prev_val,
            new_value=res.general_beds_occupied
        )
        db.add(event)
        changes.append(("General Beds", prev_val, res.general_beds_occupied, res.general_beds_available))

    # Ventilator update
    if update.ventilators_occupied is not None and update.ventilators_occupied != res.ventilators_occupied:
        prev_val = res.ventilators_occupied
        res.ventilators_occupied = update.ventilators_occupied
        event = HospitalResourceEvent(
            hospital_id=id,
            resource_name="ventilators_occupied",
            previous_value=prev_val,
            new_value=res.ventilators_occupied
        )
        db.add(event)
        changes.append(("Ventilators", prev_val, res.ventilators_occupied, res.ventilators_available))

    # Oxygen update
    if update.oxygen_available is not None and update.oxygen_available != res.oxygen_available:
        prev_val = 1 if res.oxygen_available else 0
        res.oxygen_available = update.oxygen_available
        event = HospitalResourceEvent(
            hospital_id=id,
            resource_name="oxygen_available",
            previous_value=prev_val,
            new_value=1 if res.oxygen_available else 0
        )
        db.add(event)
        changes.append(("Oxygen Availability", prev_val, 1 if res.oxygen_available else 0, 1 if res.oxygen_available else 0))

    res.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(res)

    # Publish Real-time WebSocket Event
    await ws_manager.publish_event(
        channel=f"hospital/{id}",
        event_type="RESOURCE_CHANGED",
        data={
            "hospital_id": id,
            "hospital_name": hosp.name,
            "icu_available": res.icu_available,
            "ventilators_available": res.ventilators_available,
            "oxygen_available": res.oxygen_available,
            "changes": changes
        }
    )

    # Check active referrals assigned to this hospital affected by depletion
    active_referrals = db.query(Referral).filter(
        Referral.assigned_hospital_id == id,
        Referral.status.in_([ReferralStatus.ACCEPTED, ReferralStatus.IN_TRANSIT, ReferralStatus.AT_RISK])
    ).all()

    for ref in active_referrals:
        # Check if referral required resource is depleted
        reqs = ref.requirements
        depleted = False
        missing_name = ""

        if reqs.requires_icu and res.icu_available <= 0:
            depleted = True
            missing_name = "ICU Bed"
        elif reqs.requires_ventilator and res.ventilators_available <= 0:
            depleted = True
            missing_name = "Ventilator"
        elif reqs.requires_oxygen and not res.oxygen_available:
            depleted = True
            missing_name = "Oxygen Support"

        if depleted:
            ref.status = ReferralStatus.AT_RISK
            db.commit()

            log_referral_event(
                db=db,
                referral_id=ref.id,
                event_type="DESTINATION_RESOURCE_RISK",
                description=f"Destination Hospital {hosp.name} resource ({missing_name}) depleted during transit."
            )

            # Broadcast Destination Resource Risk alert via WebSocket
            await ws_manager.publish_event(
                channel="command-center",
                event_type="DESTINATION_RESOURCE_RISK",
                data={
                    "referral_id": ref.id,
                    "referral_code": ref.referral_code,
                    "hospital_id": id,
                    "hospital_name": hosp.name,
                    "missing_resource": missing_name,
                    "status": "AT_RISK"
                }
            )
            if ref.assigned_ambulance_id:
                await ws_manager.publish_event(
                    channel=f"ambulance/{ref.assigned_ambulance_id}",
                    event_type="DESTINATION_RESOURCE_RISK",
                    data={
                        "referral_id": ref.id,
                        "referral_code": ref.referral_code,
                        "hospital_id": id,
                        "hospital_name": hosp.name,
                        "missing_resource": missing_name,
                        "status": "AT_RISK"
                    }
                )

            # Automatically trigger time-aware rerouting evaluation
            await evaluate_rerouting(db=db, referral_id=ref.id)

    return res

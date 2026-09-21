from typing import List, Dict, Any, Optional
from app.models.models import Hospital, HospitalResource, ReferralRequirement
from app.services.geo_service import haversine_distance_km, estimate_eta_minutes
from app.services.prediction_service import resource_predictor

def calculate_hospital_score(
    hospital: Hospital,
    requirements: Optional[ReferralRequirement],
    phc_lat: float,
    phc_lon: float
) -> Dict[str, Any]:
    """Calculates prototype decision-support score for a candidate hospital."""
    res: HospitalResource = hospital.resources

    requires_icu = requirements.requires_icu if requirements else False
    requires_ventilator = requirements.requires_ventilator if requirements else False
    requires_oxygen = requirements.requires_oxygen if requirements else False

    # Distance & ETA (Simulated regional ambulance emergency travel time)
    distance_km = haversine_distance_km(phc_lat, phc_lon, hospital.latitude, hospital.longitude)
    # Scaled ETA for regional presentation (~18-25 min)
    eta_minutes = max(12, int(distance_km * 0.35))

    # 1. Capability Match Check
    capability_match = True
    missing_capabilities = []

    if requires_icu and res.icu_available <= 0:
        capability_match = False
        missing_capabilities.append("ICU Bed")

    if requires_ventilator and res.ventilators_available <= 0:
        capability_match = False
        missing_capabilities.append("Ventilator")

    if requires_oxygen and not res.oxygen_available:
        capability_match = False
        missing_capabilities.append("Oxygen Support")

    # 2. Predicted Resource Availability
    pred_info = resource_predictor.predict_resource_availability(
        hospital_id=hospital.id,
        resource_type="ICU" if requires_icu else "General",
        current_available=res.icu_available if requires_icu else res.general_beds_available,
        arrival_eta_minutes=eta_minutes
    )

    # 3. Hospital Load Calculation (Occupancy ratio)
    total_beds = res.icu_total + res.general_beds_total
    occupied_beds = res.icu_occupied + res.general_beds_occupied
    load_ratio = occupied_beds / total_beds if total_beds > 0 else 1.0

    # 4. Multi-Factor Decision Scoring Formula
    score = 100.0

    if not capability_match and not pred_info["is_predicted_available"]:
        score -= 45.0
    elif not capability_match and pred_info["is_predicted_available"]:
        score -= 15.0

    # Travel time penalty
    score -= (eta_minutes * 0.8)

    # Hospital load penalty
    score -= (load_ratio * 12.0)

    # Doctor availability bonus
    if res.emergency_doctors_available > 0:
        score += 8.0

    final_score = max(10.0, min(99.0, round(score, 1)))

    if capability_match:
        reason = f"Full capability match. {res.icu_available} ICU beds available, ETA {eta_minutes} min."
    elif pred_info["is_predicted_available"]:
        reason = f"Current resource tight, but predicted release in ~{pred_info['expected_available_time_minutes']} min near ETA."
    else:
        reason = f"Critical resource unmet ({', '.join(missing_capabilities)} unavailable)."

    return {
        "hospital": hospital,
        "hospital_id": hospital.id,
        "hospital_name": hospital.name,
        "distance_km": distance_km,
        "eta_minutes": eta_minutes,
        "capability_match": capability_match,
        "missing_capabilities": missing_capabilities,
        "icu_available": res.icu_available,
        "ventilators_available": res.ventilators_available,
        "oxygen_available": res.oxygen_available,
        "score": final_score,
        "recommendation_reason": reason,
        "prediction": pred_info
    }

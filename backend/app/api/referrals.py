import random
import string
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Patient, Referral, ReferralRequirement, Hospital, PHCCenter, ReferralStatus, Ambulance
)
from app.schemas.schemas import (
    ReferralCreate, ReferralOut, HospitalCandidate
)
from app.services.clinical_parser import clinical_parser
from app.services.scoring_engine import calculate_hospital_score
from app.services.audit_service import log_referral_event
from app.websocket.connection_manager import ws_manager

router = APIRouter(prefix="/referrals", tags=["Referrals"])

def generate_referral_code() -> str:
    digits = ''.join(random.choices(string.digits, k=4))
    return f"REF-2026-{digits}"

@router.post("", response_model=ReferralOut)
async def create_referral(referral_in: ReferralCreate, db: Session = Depends(get_db)):
    phc = db.query(PHCCenter).filter(PHCCenter.id == referral_in.phc_id).first()
    if not phc:
        phc = db.query(PHCCenter).first()
        if not phc:
            raise HTTPException(status_code=404, detail="PHC Center not found")

    patient = Patient(
        name=referral_in.patient_name,
        age=referral_in.age,
        gender=referral_in.gender,
        contact_number=referral_in.contact_number,
        medical_history=referral_in.medical_history
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    vitals = {
        "spo2": referral_in.spo2,
        "heart_rate": referral_in.heart_rate,
        "blood_pressure": referral_in.blood_pressure
    }
    parsed = clinical_parser.parse_symptoms(referral_in.symptoms, vitals)

    code = generate_referral_code()
    referral = Referral(
        referral_code=code,
        patient_id=patient.id,
        phc_id=phc.id,
        emergency_type=parsed["emergency_type"],
        priority=parsed["priority"],
        symptoms=referral_in.symptoms,
        spo2=referral_in.spo2,
        heart_rate=referral_in.heart_rate,
        blood_pressure=referral_in.blood_pressure,
        notes=referral_in.notes,
        status=ReferralStatus.PENDING
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)

    reqs = ReferralRequirement(
        referral_id=referral.id,
        requires_icu=parsed["requires_icu"],
        requires_ventilator=parsed["requires_ventilator"],
        requires_oxygen=parsed["requires_oxygen"],
        requires_emergency_physician=parsed["requires_emergency_physician"],
        specialist_type=parsed["specialist_type"]
    )
    db.add(reqs)
    db.commit()

    log_referral_event(
        db=db,
        referral_id=referral.id,
        event_type="REFERRAL_CREATED",
        description=f"Referral created for patient {patient.name} with emergency type: {parsed['emergency_type']}"
    )

    await ws_manager.publish_event(
        channel="command-center",
        event_type="REFERRAL_CREATED",
        data={"referral_id": referral.id, "referral_code": code, "patient_name": patient.name}
    )

    return db.query(Referral).filter(Referral.id == referral.id).first()

@router.get("/{id}", response_model=ReferralOut)
def get_referral(id: str, db: Session = Depends(get_db)):
    ref = db.query(Referral).filter(Referral.id == id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referral not found")
    return ref

@router.post("/{id}/recommendations", response_model=List[HospitalCandidate])
def get_hospital_recommendations(id: str, db: Session = Depends(get_db)):
    ref = db.query(Referral).filter(Referral.id == id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referral not found")

    phc_lat = ref.phc.latitude if ref.phc else 18.8286
    phc_lon = ref.phc.longitude if ref.phc else 74.3789
    reqs = ref.requirements

    hospitals = db.query(Hospital).filter(Hospital.is_active == True).all()

    candidates = []
    for hosp in hospitals:
        if not hosp.resources:
            continue
        candidate_data = calculate_hospital_score(
            hospital=hosp,
            requirements=reqs,
            phc_lat=phc_lat,
            phc_lon=phc_lon
        )
        candidates.append(candidate_data)

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates

@router.post("/{id}/accept")
async def accept_referral_hospital(
    id: str,
    hospital_id: str,
    db: Session = Depends(get_db)
):
    ref = db.query(Referral).filter(Referral.id == id).first()
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()

    if not ref or not hosp:
        raise HTTPException(status_code=404, detail="Referral or Hospital not found")

    ref.assigned_hospital_id = hosp.id
    ref.status = ReferralStatus.ACCEPTED

    if not ref.assigned_ambulance_id:
        avail_amb = db.query(Ambulance).filter(Ambulance.is_available == True).first()
        if avail_amb:
            ref.assigned_ambulance_id = avail_amb.id
            avail_amb.is_available = False
        else:
            # Fall back to first ambulance if all occupied for continuous workflow
            first_amb = db.query(Ambulance).first()
            if first_amb:
                ref.assigned_ambulance_id = first_amb.id

    db.commit()

    amb_info = ref.assigned_ambulance_id if ref.assigned_ambulance_id else "Pending Dispatch"
    log_referral_event(
        db=db,
        referral_id=ref.id,
        event_type="HOSPITAL_ACCEPTED",
        description=f"Referral accepted by hospital {hosp.name}. Assigned Ambulance: {amb_info}"
    )

    event_payload = {
        "referral_id": ref.id,
        "referral_code": ref.referral_code,
        "patient_name": ref.patient.name if ref.patient else "Patient",
        "hospital_id": hosp.id,
        "hospital_name": hosp.name,
        "status": "ACCEPTED"
    }

    await ws_manager.publish_event(
        channel=f"hospital/{hosp.id}",
        event_type="REFERRAL_ACCEPTED",
        data=event_payload
    )
    await ws_manager.publish_event(
        channel="command-center",
        event_type="REFERRAL_ACCEPTED",
        data=event_payload
    )

    return {"status": "success", "referral_id": ref.id, "hospital_name": hosp.name, "ambulance_id": ref.assigned_ambulance_id}

@router.post("/{id}/complete")
async def complete_referral(
    id: str,
    db: Session = Depends(get_db)
):
    ref = db.query(Referral).filter(Referral.id == id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referral not found")

    ref.status = ReferralStatus.COMPLETED

    if ref.assigned_ambulance_id:
        amb = db.query(Ambulance).filter(Ambulance.id == ref.assigned_ambulance_id).first()
        if amb:
            amb.is_available = True

    db.commit()

    log_referral_event(
        db=db,
        referral_id=ref.id,
        event_type="REFERRAL_COMPLETED",
        description=f"Patient admitted at hospital ER bay. Referral ticket completed successfully."
    )

    event_payload = {
        "referral_id": ref.id,
        "referral_code": ref.referral_code,
        "hospital_id": ref.assigned_hospital_id,
        "status": "COMPLETED"
    }

    if ref.assigned_hospital_id:
        await ws_manager.publish_event(
            channel=f"hospital/{ref.assigned_hospital_id}",
            event_type="REFERRAL_COMPLETED",
            data=event_payload
        )
    if ref.assigned_ambulance_id:
        await ws_manager.publish_event(
            channel=f"ambulance/{ref.assigned_ambulance_id}",
            event_type="REFERRAL_COMPLETED",
            data=event_payload
        )
    await ws_manager.publish_event(
        channel="command-center",
        event_type="REFERRAL_COMPLETED",
        data=event_payload
    )

    return {"status": "success", "referral_id": ref.id, "referral_status": "COMPLETED"}

@router.get("/hospital/{hospital_id}/incoming", response_model=List[ReferralOut])
def get_incoming_referrals(hospital_id: str, db: Session = Depends(get_db)):
    return db.query(Referral).filter(
        Referral.assigned_hospital_id == hospital_id
    ).order_by(Referral.created_at.desc()).all()

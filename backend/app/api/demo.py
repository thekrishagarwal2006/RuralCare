from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Hospital, HospitalResource, Referral, Ambulance, ReferralStatus
from app.schemas.schemas import ResourceUpdate
from app.api.hospitals import update_hospital_resources
from app.services.rerouting_engine import evaluate_rerouting
from app.websocket.connection_manager import ws_manager

router = APIRouter(prefix="/demo", tags=["Demo Simulator Controls"])

@router.post("/trigger-icu-depletion/{hospital_id}")
async def trigger_icu_depletion(hospital_id: str, db: Session = Depends(get_db)):
    """Simulates setting Hospital ICU available count to 0 instantly."""
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp or not hosp.resources:
        raise HTTPException(status_code=404, detail="Hospital not found")

    res = hosp.resources
    # Set occupied equal to total so available becomes 0
    update_data = ResourceUpdate(icu_occupied=res.icu_total)
    return await update_hospital_resources(id=hospital_id, update=update_data, db=db)

@router.post("/trigger-resource-restore/{hospital_id}")
async def trigger_resource_restore(hospital_id: str, db: Session = Depends(get_db)):
    """Restores ICU beds to available state for demo reset."""
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp or not hosp.resources:
        raise HTTPException(status_code=404, detail="Hospital not found")

    res = hosp.resources
    update_data = ResourceUpdate(icu_occupied=max(0, res.icu_total - 4))
    return await update_hospital_resources(id=hospital_id, update=update_data, db=db)

@router.post("/trigger-reroute-evaluation/{referral_id}")
async def trigger_manual_reroute_eval(referral_id: str, db: Session = Depends(get_db)):
    """Triggers dynamic rerouting evaluation on demand for demo evaluation."""
    result = await evaluate_rerouting(db=db, referral_id=referral_id)
    return result

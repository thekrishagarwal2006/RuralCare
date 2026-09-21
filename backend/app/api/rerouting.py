from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Referral, Hospital, ReferralStatus, ReroutingDecision
from app.schemas.schemas import RerouteEvaluationRequest
from app.services.rerouting_engine import evaluate_rerouting
from app.services.audit_service import log_referral_event
from app.websocket.connection_manager import ws_manager

router = APIRouter(prefix="/rerouting", tags=["Rerouting Engine"])

@router.post("/evaluate")
async def evaluate_reroute_endpoint(
    req: RerouteEvaluationRequest,
    db: Session = Depends(get_db)
):
    result = await evaluate_rerouting(
        db=db,
        referral_id=req.referral_id,
        current_lat=req.current_latitude,
        current_lon=req.current_longitude
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/{referral_id}/accept")
async def accept_reroute(
    referral_id: str,
    target_hospital_id: str,
    db: Session = Depends(get_db)
):
    ref = db.query(Referral).filter(Referral.id == referral_id).first()
    new_hosp = db.query(Hospital).filter(Hospital.id == target_hospital_id).first()

    if not ref or not new_hosp:
        raise HTTPException(status_code=404, detail="Referral or Hospital not found")

    old_hosp_id = ref.assigned_hospital_id
    ref.assigned_hospital_id = new_hosp.id
    ref.status = ReferralStatus.REROUTING
    db.commit()

    log_referral_event(
        db=db,
        referral_id=ref.id,
        event_type="REROUTE_ACCEPTED",
        description=f"Ambulance rerouted to new destination hospital: {new_hosp.name}"
    )

    # Publish WebSocket Event
    await ws_manager.publish_event(
        channel=f"hospital/{new_hosp.id}",
        event_type="REROUTED_REFERRAL_INCOMING",
        data={
            "referral_id": ref.id,
            "referral_code": ref.referral_code,
            "patient_name": ref.patient.name,
            "new_hospital_name": new_hosp.name
        }
    )
    await ws_manager.publish_event(
        channel="command-center",
        event_type="REROUTE_ACCEPTED",
        data={
            "referral_id": ref.id,
            "referral_code": ref.referral_code,
            "old_hospital_id": old_hosp_id,
            "new_hospital_id": new_hosp.id,
            "new_hospital_name": new_hosp.name
        }
    )

    return {
        "status": "success",
        "referral_id": ref.id,
        "new_hospital_id": new_hosp.id,
        "new_hospital_name": new_hosp.name,
        "referral_status": ref.status.value
    }

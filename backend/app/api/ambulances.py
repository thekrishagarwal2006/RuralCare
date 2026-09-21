from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Ambulance, AmbulanceLocation, Referral, ReferralStatus
from app.schemas.schemas import AmbulanceOut, LocationUpdate
from app.websocket.connection_manager import ws_manager
from app.services.rerouting_engine import evaluate_rerouting

router = APIRouter(prefix="/ambulances", tags=["Ambulances"])

@router.get("", response_model=List[AmbulanceOut])
def get_ambulances(db: Session = Depends(get_db)):
    return db.query(Ambulance).all()

@router.get("/{id}", response_model=AmbulanceOut)
def get_ambulance(id: str, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return amb

@router.post("/{id}/location")
async def update_ambulance_location(
    id: str,
    loc_in: LocationUpdate,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.current_latitude = loc_in.latitude
    amb.current_longitude = loc_in.longitude

    # Save to Location History
    loc_hist = AmbulanceLocation(
        ambulance_id=id,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        speed=loc_in.speed,
        heading=loc_in.heading
    )
    db.add(loc_hist)
    db.commit()

    # Broadcast GPS update via WebSocket
    await ws_manager.publish_event(
        channel=f"ambulance/{id}",
        event_type="AMBULANCE_LOCATION_UPDATED",
        data={
            "ambulance_id": id,
            "latitude": loc_in.latitude,
            "longitude": loc_in.longitude,
            "speed": loc_in.speed,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    # Check if this ambulance is assigned to an active referral
    active_ref = db.query(Referral).filter(
        Referral.assigned_ambulance_id == id,
        Referral.status.in_([ReferralStatus.ACCEPTED, ReferralStatus.IN_TRANSIT, ReferralStatus.AT_RISK])
    ).first()

    if active_ref:
        if active_ref.status == ReferralStatus.ACCEPTED:
            active_ref.status = ReferralStatus.IN_TRANSIT
            db.commit()

        # If referral is AT_RISK, re-evaluate rerouting from new location
        if active_ref.status == ReferralStatus.AT_RISK:
            await evaluate_rerouting(
                db=db,
                referral_id=active_ref.id,
                current_lat=loc_in.latitude,
                current_lon=loc_in.longitude
            )

    return {"status": "success", "ambulance_id": id, "latitude": loc_in.latitude, "longitude": loc_in.longitude}

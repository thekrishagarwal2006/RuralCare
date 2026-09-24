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

from app.services.geo_service import get_osrm_route
from typing import Optional

@router.get("/{id}/route")
async def get_ambulance_route(
    id: str,
    start_lat: Optional[float] = None,
    start_lon: Optional[float] = None,
    end_lat: Optional[float] = None,
    end_lon: Optional[float] = None,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    # If explicit coordinates passed
    if start_lat is not None and start_lon is not None and end_lat is not None and end_lon is not None:
        return await get_osrm_route(start_lat, start_lon, end_lat, end_lon)

    # Otherwise look for active referral assigned to this ambulance
    active_ref = db.query(Referral).filter(
        Referral.assigned_ambulance_id == id,
        Referral.status.in_([
            ReferralStatus.ACCEPTED,
            ReferralStatus.IN_TRANSIT,
            ReferralStatus.AT_RISK,
            ReferralStatus.REROUTED
        ])
    ).first()

    if active_ref and active_ref.hospital and active_ref.phc:
        s_lat = amb.current_latitude if amb.current_latitude else active_ref.phc.latitude
        s_lon = amb.current_longitude if amb.current_longitude else active_ref.phc.longitude
        e_lat = active_ref.hospital.latitude
        e_lon = active_ref.hospital.longitude
        return await get_osrm_route(s_lat, s_lon, e_lat, e_lon)

    # Fallback to current location to nearest hospital or default
    if start_lat is not None and start_lon is not None:
        s_lat, s_lon = start_lat, start_lon
    else:
        s_lat, s_lon = amb.current_latitude, amb.current_longitude

    # Default to Sassoon Hospital if no referral
    e_lat, e_lon = 18.5250, 73.8710
    return await get_osrm_route(s_lat, s_lon, e_lat, e_lon)


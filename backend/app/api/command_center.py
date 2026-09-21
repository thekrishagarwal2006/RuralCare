from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import (
    Hospital, Ambulance, Referral, PHCCenter, ReferralEvent, ReferralStatus
)

router = APIRouter(prefix="/command-center", tags=["Command Center"])

@router.get("/overview")
def get_command_center_overview(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    phcs = db.query(PHCCenter).all()
    ambulances = db.query(Ambulance).all()
    active_referrals = db.query(Referral).filter(
        Referral.status.in_([
            ReferralStatus.PENDING, ReferralStatus.ACCEPTED,
            ReferralStatus.IN_TRANSIT, ReferralStatus.AT_RISK, ReferralStatus.REROUTING
        ])
    ).all()
    recent_events = db.query(ReferralEvent).order_by(
        ReferralEvent.timestamp.desc()
    ).limit(30).all()

    # Aggregated metrics
    total_icu_total = sum(h.resources.icu_total for h in hospitals if h.resources)
    total_icu_avail = sum(h.resources.icu_available for h in hospitals if h.resources)
    total_vent_total = sum(h.resources.ventilators_total for h in hospitals if h.resources)
    total_vent_avail = sum(h.resources.ventilators_available for h in hospitals if h.resources)

    return {
        "hospitals_count": len(hospitals),
        "phcs_count": len(phcs),
        "ambulances_count": len(ambulances),
        "active_referrals_count": len(active_referrals),
        "metrics": {
            "total_icu_total": total_icu_total,
            "total_icu_available": total_icu_avail,
            "total_ventilators_total": total_vent_total,
            "total_ventilators_available": total_vent_avail
        },
        "hospitals": hospitals,
        "phcs": phcs,
        "ambulances": ambulances,
        "active_referrals": active_referrals,
        "recent_events": recent_events
    }

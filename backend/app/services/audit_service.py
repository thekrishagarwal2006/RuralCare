from sqlalchemy.orm import Session
from app.models.models import ReferralEvent

def log_referral_event(
    db: Session,
    referral_id: str,
    event_type: str,
    description: str,
    actor_id: str = None
) -> ReferralEvent:
    event = ReferralEvent(
        referral_id=referral_id,
        event_type=event_type,
        description=description,
        actor_id=actor_id
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import PHCCenter
from app.schemas.schemas import PHCCenterOut

router = APIRouter(prefix="/phc", tags=["PHC Centers"])

@router.get("/centers", response_model=List[PHCCenterOut])
def get_phc_centers(db: Session = Depends(get_db)):
    return db.query(PHCCenter).all()

@router.get("/centers/{id}", response_model=PHCCenterOut)
def get_phc_center(id: str, db: Session = Depends(get_db)):
    phc = db.query(PHCCenter).filter(PHCCenter.id == id).first()
    if not phc:
        raise HTTPException(status_code=404, detail="PHC Center not found")
    return phc

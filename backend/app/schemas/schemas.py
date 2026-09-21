from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.models import UserRole, ReferralStatus, RerouteDecisionEnum

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

# User schemas
class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: UserRole
    associated_entity_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Hospital & Resource schemas
class ResourceUpdate(BaseModel):
    icu_occupied: Optional[int] = None
    general_beds_occupied: Optional[int] = None
    ventilators_occupied: Optional[int] = None
    oxygen_available: Optional[bool] = None
    blood_units_available: Optional[int] = None
    emergency_doctors_available: Optional[int] = None
    specialists_available: Optional[int] = None

class HospitalResourceOut(BaseModel):
    id: str
    hospital_id: str
    icu_total: int
    icu_occupied: int
    icu_available: int
    general_beds_total: int
    general_beds_occupied: int
    general_beds_available: int
    ventilators_total: int
    ventilators_occupied: int
    ventilators_available: int
    oxygen_available: bool
    blood_units_available: int
    emergency_doctors_available: int
    specialists_available: int
    last_updated: datetime
    model_config = ConfigDict(from_attributes=True)

class HospitalOut(BaseModel):
    id: str
    name: str
    district: str
    state: str
    tier: str
    latitude: float
    longitude: float
    contact_number: str
    is_active: bool
    resources: Optional[HospitalResourceOut] = None
    model_config = ConfigDict(from_attributes=True)

class PHCCenterOut(BaseModel):
    id: str
    name: str
    district: str
    state: str
    latitude: float
    longitude: float
    contact_number: str
    model_config = ConfigDict(from_attributes=True)

# Patient & Referral schemas
class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None

class ReferralCreate(BaseModel):
    patient_name: str
    age: int
    gender: str
    contact_number: Optional[str] = None
    medical_history: Optional[str] = None
    phc_id: str
    emergency_type: str
    priority: str = "CRITICAL"
    symptoms: str
    spo2: Optional[int] = None
    heart_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    notes: Optional[str] = None

class ReferralRequirementOut(BaseModel):
    requires_icu: bool
    requires_ventilator: bool
    requires_oxygen: bool
    requires_emergency_physician: bool
    specialist_type: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ReferralOut(BaseModel):
    id: str
    referral_code: str
    patient_id: str
    phc_id: str
    origin_doctor_id: Optional[str] = None
    assigned_hospital_id: Optional[str] = None
    assigned_ambulance_id: Optional[str] = None
    status: ReferralStatus
    emergency_type: str
    priority: str
    symptoms: str
    spo2: Optional[int] = None
    heart_rate: Optional[int] = None
    blood_pressure: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    requirements: Optional[ReferralRequirementOut] = None
    hospital: Optional[HospitalOut] = None
    phc: Optional[PHCCenterOut] = None
    model_config = ConfigDict(from_attributes=True)

# Hospital Recommendation Candidate
class HospitalCandidate(BaseModel):
    hospital: HospitalOut
    hospital_id: str
    hospital_name: str
    distance_km: float
    eta_minutes: int
    capability_match: bool
    missing_capabilities: List[str] = []
    icu_available: int
    ventilators_available: int
    oxygen_available: bool
    score: float
    recommendation_reason: str
    model_config = ConfigDict(from_attributes=True)

# Ambulance & Location Schemas
class AmbulanceOut(BaseModel):
    id: str
    vehicle_number: str
    driver_name: str
    driver_phone: str
    current_latitude: float
    current_longitude: float
    is_available: bool
    model_config = ConfigDict(from_attributes=True)

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    heading: Optional[float] = 0.0

# Rerouting Decision Schemas
class RerouteEvaluationRequest(BaseModel):
    referral_id: str
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None

class RerouteDecisionOut(BaseModel):
    referral_id: str
    referral_code: Optional[str] = None
    decision: RerouteDecisionEnum
    reason: str
    current_hospital_id: str
    current_hospital_name: str
    current_hospital_eta: int
    recommended_hospital_id: Optional[str] = None
    recommended_hospital_name: Optional[str] = None
    recommended_hospital_eta: Optional[int] = None
    status: str = "evaluated"
    timestamp: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Audit Event
class ReferralEventOut(BaseModel):
    id: str
    referral_id: str
    event_type: str
    description: str
    actor_id: Optional[str] = None
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    PHC_DOCTOR = "PHC_DOCTOR"
    HOSPITAL_STAFF = "HOSPITAL_STAFF"
    AMBULANCE_OPERATOR = "AMBULANCE_OPERATOR"
    COMMAND_CENTER = "COMMAND_CENTER"
    ADMIN = "ADMIN"

class ReferralStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    IN_TRANSIT = "IN_TRANSIT"
    AT_RISK = "AT_RISK"
    REROUTING = "REROUTING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class RerouteDecisionEnum(str, enum.Enum):
    CONTINUE = "CONTINUE"
    WAIT_AND_STABILIZE = "WAIT_AND_STABILIZE"
    REROUTE = "REROUTE"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    associated_entity_id = Column(String(36), nullable=True) # Linked PHC or Hospital ID
    created_at = Column(DateTime, default=datetime.utcnow)

class PHCCenter(Base):
    __tablename__ = "phc_centers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_number = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    tier = Column(String(50), default="Tertiary Care")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_number = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    resources = relationship("HospitalResource", back_populates="hospital", uselist=False)

class HospitalResource(Base):
    __tablename__ = "hospital_resources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), unique=True, nullable=False)
    icu_total = Column(Integer, default=10)
    icu_occupied = Column(Integer, default=9)
    general_beds_total = Column(Integer, default=50)
    general_beds_occupied = Column(Integer, default=40)
    ventilators_total = Column(Integer, default=5)
    ventilators_occupied = Column(Integer, default=4)
    oxygen_available = Column(Boolean, default=True)
    blood_units_available = Column(Integer, default=15)
    emergency_doctors_available = Column(Integer, default=2)
    specialists_available = Column(Integer, default=3)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="resources")

    @property
    def icu_available(self):
        return max(0, self.icu_total - self.icu_occupied)

    @property
    def ventilators_available(self):
        return max(0, self.ventilators_total - self.ventilators_occupied)

    @property
    def general_beds_available(self):
        return max(0, self.general_beds_total - self.general_beds_occupied)

class HospitalResourceEvent(Base):
    __tablename__ = "hospital_resource_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    resource_name = Column(String(100), nullable=False)
    previous_value = Column(Integer, nullable=False)
    new_value = Column(Integer, nullable=False)
    updated_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    contact_number = Column(String(20), nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    referral_code = Column(String(20), unique=True, nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    phc_id = Column(String(36), ForeignKey("phc_centers.id"), nullable=False)
    origin_doctor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    assigned_ambulance_id = Column(String(36), ForeignKey("ambulances.id"), nullable=True)
    status = Column(Enum(ReferralStatus), default=ReferralStatus.PENDING)
    emergency_type = Column(String(100), nullable=False)
    priority = Column(String(20), default="CRITICAL")
    symptoms = Column(Text, nullable=False)
    spo2 = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    blood_pressure = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requirements = relationship("ReferralRequirement", back_populates="referral", uselist=False)
    patient = relationship("Patient")
    phc = relationship("PHCCenter")
    hospital = relationship("Hospital")
    ambulance = relationship("Ambulance")

class ReferralRequirement(Base):
    __tablename__ = "referral_requirements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=False, unique=True)
    requires_icu = Column(Boolean, default=False)
    requires_ventilator = Column(Boolean, default=False)
    requires_oxygen = Column(Boolean, default=False)
    requires_emergency_physician = Column(Boolean, default=False)
    specialist_type = Column(String(100), nullable=True)

    referral = relationship("Referral", back_populates="requirements")

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    vehicle_number = Column(String(50), unique=True, nullable=False)
    driver_name = Column(String(150), nullable=False)
    driver_phone = Column(String(20), nullable=False)
    current_latitude = Column(Float, nullable=False)
    current_longitude = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AmbulanceLocation(Base):
    __tablename__ = "ambulance_locations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ambulance_id = Column(String(36), ForeignKey("ambulances.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed = Column(Float, default=0.0)
    heading = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ReroutingDecision(Base):
    __tablename__ = "rerouting_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=False)
    trigger_resource_event_id = Column(String(36), ForeignKey("hospital_resource_events.id"), nullable=True)
    current_hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    recommended_hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    decision = Column(Enum(RerouteDecisionEnum), nullable=False)
    reason = Column(Text, nullable=False)
    current_hospital_eta = Column(Integer, nullable=True)
    recommended_hospital_eta = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class ReferralEvent(Base):
    __tablename__ = "referral_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    referral_id = Column(String(36), ForeignKey("referrals.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

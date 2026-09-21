import sys
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, PHCCenter, Hospital, HospitalResource, Ambulance,
    Patient, Referral, ReferralRequirement, ReferralStatus
)

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Clear existing data if any
    try:
        db.query(ReferralRequirement).delete()
        db.query(Referral).delete()
        db.query(Patient).delete()
        db.query(HospitalResource).delete()
        db.query(Hospital).delete()
        db.query(PHCCenter).delete()
        db.query(Ambulance).delete()
        db.query(User).delete()
        db.commit()
    except Exception:
        db.rollback()

    print("Seeding RuralCare system dataset...")

    # 1. Seed PHC Centers
    phc_a = PHCCenter(
        id="phc-shirur-01",
        name="Shirur Primary Health Centre",
        district="Pune",
        state="Maharashtra",
        latitude=18.8286,
        longitude=74.3789,
        contact_number="+91 2138 222100"
    )
    phc_b = PHCCenter(
        id="phc-khed-02",
        name="Khed Rural Health Centre",
        district="Pune",
        state="Maharashtra",
        latitude=18.8500,
        longitude=73.9167,
        contact_number="+91 2135 222050"
    )
    db.add_all([phc_a, phc_b])
    db.commit()

    # 2. Seed Hospitals
    hosp_a = Hospital(
        id="hosp-sassoon-01",
        name="Sassoon General Hospital",
        district="Pune",
        state="Maharashtra",
        tier="Government Tertiary Hospital",
        latitude=18.5250,
        longitude=73.8710,
        contact_number="+91 20 2612 8000"
    )
    hosp_b = Hospital(
        id="hosp-sahyadri-02",
        name="Sahyadri Super Speciality Hospital",
        district="Pune",
        state="Maharashtra",
        tier="Private Tertiary Specialty",
        latitude=18.5158,
        longitude=73.8340,
        contact_number="+91 20 6721 3000"
    )
    hosp_c = Hospital(
        id="hosp-deenanath-03",
        name="Deenanath Mangeshkar Hospital",
        district="Pune",
        state="Maharashtra",
        tier="Super Speciality Hospital",
        latitude=18.5042,
        longitude=73.8347,
        contact_number="+91 20 4015 1000"
    )
    db.add_all([hosp_a, hosp_b, hosp_c])
    db.commit()

    # 3. Seed Hospital Resources
    # Hosp A: ICU Available = 10 - 9 = 1 (Ready for $1 -> 0 demo!)
    res_a = HospitalResource(
        id="res-sassoon-01",
        hospital_id=hosp_a.id,
        icu_total=10,
        icu_occupied=9,
        general_beds_total=50,
        general_beds_occupied=42,
        ventilators_total=5,
        ventilators_occupied=4,
        oxygen_available=True,
        blood_units_available=15,
        emergency_doctors_available=2,
        specialists_available=3
    )

    # Hosp B: ICU Available = 12 - 8 = 4 (Target for reroute!)
    res_b = HospitalResource(
        id="res-sahyadri-02",
        hospital_id=hosp_b.id,
        icu_total=12,
        icu_occupied=8,
        general_beds_total=60,
        general_beds_occupied=35,
        ventilators_total=6,
        ventilators_occupied=3,
        oxygen_available=True,
        blood_units_available=25,
        emergency_doctors_available=4,
        specialists_available=5
    )

    # Hosp C: ICU Available = 8 - 8 = 0 (Full)
    res_c = HospitalResource(
        id="res-deenanath-03",
        hospital_id=hosp_c.id,
        icu_total=8,
        icu_occupied=8,
        general_beds_total=40,
        general_beds_occupied=39,
        ventilators_total=4,
        ventilators_occupied=4,
        oxygen_available=False,
        blood_units_available=4,
        emergency_doctors_available=1,
        specialists_available=1
    )
    db.add_all([res_a, res_b, res_c])
    db.commit()

    # 4. Seed Ambulances
    amb_1 = Ambulance(
        id="amb-1001",
        vehicle_number="MH-12-AM-1001",
        driver_name="Ramesh Pawar",
        driver_phone="+91 98220 11223",
        current_latitude=18.8286, # Starts at Shirur PHC
        current_longitude=74.3789,
        is_available=True
    )
    amb_2 = Ambulance(
        id="amb-1002",
        vehicle_number="MH-12-AM-1002",
        driver_name="Suresh Patil",
        driver_phone="+91 98220 44556",
        current_latitude=18.8500, # Starts at Khed PHC
        current_longitude=73.9167,
        is_available=True
    )
    amb_3 = Ambulance(
        id="amb-1003",
        vehicle_number="MH-12-AM-1003",
        driver_name="Vikas Shinde",
        driver_phone="+91 98220 77889",
        current_latitude=18.5250,
        current_longitude=73.8710,
        is_available=True
    )
    db.add_all([amb_1, amb_2, amb_3])
    db.commit()

    # 4.5 Seed Initial Active Emergency Patient & Referral
    pat_1 = Patient(
        id="pat-1001",
        name="Rajesh Kumar",
        age=54,
        gender="Male",
        contact_number="+91 98230 44112",
        medical_history="Hypertension, Asthma"
    )
    db.add(pat_1)
    db.commit()

    ref_1 = Referral(
        id="ref-1001",
        referral_code="REF-2026-1001",
        patient_id=pat_1.id,
        phc_id=phc_a.id,
        assigned_hospital_id=hosp_a.id,
        assigned_ambulance_id=amb_1.id,
        status=ReferralStatus.ACCEPTED,
        emergency_type="Acute Respiratory Distress",
        priority="CRITICAL",
        symptoms="Patient has severe acute breathing difficulty, oxygen saturation 82%, gasping, respiratory distress.",
        spo2=82,
        heart_rate=118,
        blood_pressure="90/60",
        notes="Patient stabilized with temporary oxygen at Shirur PHC. Urgent tertiary care transfer required."
    )
    db.add(ref_1)
    db.commit()

    req_1 = ReferralRequirement(
        id="req-1001",
        referral_id=ref_1.id,
        requires_icu=True,
        requires_ventilator=True,
        requires_oxygen=True,
        requires_emergency_physician=True
    )
    db.add(req_1)
    db.commit()

    # 5. Seed Users for 4 Actor Portals
    users = [
        User(
            id="user-phc-01",
            username="phc_doctor1",
            email="doctor1@ruralcare.gov.in",
            hashed_password=get_password_hash("doctor123"),
            full_name="Dr. Anil Deshmukh",
            role=UserRole.PHC_DOCTOR,
            associated_entity_id=phc_a.id
        ),
        User(
            id="user-hosp-01",
            username="hosp_admin1",
            email="admin@sassoon.gov.in",
            hashed_password=get_password_hash("hosp123"),
            full_name="Sassoon ER Admin",
            role=UserRole.HOSPITAL_STAFF,
            associated_entity_id=hosp_a.id
        ),
        User(
            id="user-hosp-02",
            username="hosp_admin2",
            email="admin@sahyadri.com",
            hashed_password=get_password_hash("hosp123"),
            full_name="Sahyadri ER Admin",
            role=UserRole.HOSPITAL_STAFF,
            associated_entity_id=hosp_b.id
        ),
        User(
            id="user-amb-01",
            username="driver1",
            email="driver1@ruralcare.gov.in",
            hashed_password=get_password_hash("driver123"),
            full_name="Ramesh Pawar (Driver)",
            role=UserRole.AMBULANCE_OPERATOR,
            associated_entity_id=amb_1.id
        ),
        User(
            id="user-cmd-01",
            username="command1",
            email="command@ruralcare.gov.in",
            hashed_password=get_password_hash("command123"),
            full_name="Central Command Officer",
            role=UserRole.COMMAND_CENTER,
            associated_entity_id=None
        ),
        User(
            id="user-admin-01",
            username="admin",
            email="admin@ruralcare.gov.in",
            hashed_password=get_password_hash("admin123"),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            associated_entity_id=None
        )
    ]
    db.add_all(users)
    db.commit()

    print("Seed data successfully created!")
    db.close()

if __name__ == "__main__":
    seed_database()

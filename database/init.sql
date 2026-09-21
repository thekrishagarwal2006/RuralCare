-- RuralCare PostgreSQL Initialisation Script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types
CREATE TYPE user_role AS ENUM ('PHC_DOCTOR', 'HOSPITAL_STAFF', 'AMBULANCE_OPERATOR', 'COMMAND_CENTER', 'ADMIN');
CREATE TYPE referral_status AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'AT_RISK', 'REROUTING', 'COMPLETED', 'CANCELLED');
CREATE TYPE reroute_decision AS ENUM ('CONTINUE', 'WAIT_AND_STABILIZE', 'REROUTE');

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL,
    associated_entity_id UUID, -- Links to PHC or Hospital ID if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PHC Centers
CREATE TABLE IF NOT EXISTS phc_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    tier VARCHAR(50) DEFAULT 'Tertiary Care',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hospital Resources
CREATE TABLE IF NOT EXISTS hospital_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE,
    icu_total INT DEFAULT 10,
    icu_occupied INT DEFAULT 9,
    general_beds_total INT DEFAULT 50,
    general_beds_occupied INT DEFAULT 40,
    ventilators_total INT DEFAULT 5,
    ventilators_occupied INT DEFAULT 4,
    oxygen_available BOOLEAN DEFAULT TRUE,
    blood_units_available INT DEFAULT 15,
    emergency_doctors_available INT DEFAULT 2,
    specialists_available INT DEFAULT 3,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hospital Resource Events
CREATE TABLE IF NOT EXISTS hospital_resource_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    resource_name VARCHAR(100) NOT NULL,
    previous_value INT NOT NULL,
    new_value INT NOT NULL,
    updated_by_user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    contact_number VARCHAR(20),
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    phc_id UUID REFERENCES phc_centers(id) ON DELETE CASCADE,
    origin_doctor_id UUID REFERENCES users(id),
    assigned_hospital_id UUID REFERENCES hospitals(id),
    assigned_ambulance_id UUID,
    status referral_status DEFAULT 'PENDING',
    emergency_type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'CRITICAL',
    symptoms TEXT NOT NULL,
    spo2 INT,
    heart_rate INT,
    blood_pressure VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Referral Requirements
CREATE TABLE IF NOT EXISTS referral_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    requires_icu BOOLEAN DEFAULT FALSE,
    requires_ventilator BOOLEAN DEFAULT FALSE,
    requires_oxygen BOOLEAN DEFAULT FALSE,
    requires_emergency_physician BOOLEAN DEFAULT FALSE,
    specialist_type VARCHAR(100)
);

-- Ambulances
CREATE TABLE IF NOT EXISTS ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    driver_name VARCHAR(150) NOT NULL,
    driver_phone VARCHAR(20) NOT NULL,
    current_latitude DOUBLE PRECISION NOT NULL,
    current_longitude DOUBLE PRECISION NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ambulance Location History
CREATE TABLE IF NOT EXISTS ambulance_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambulance_id UUID REFERENCES ambulances(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION DEFAULT 0.0,
    heading DOUBLE PRECISION DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rerouting Decisions Log
CREATE TABLE IF NOT EXISTS rerouting_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    trigger_resource_event_id UUID REFERENCES hospital_resource_events(id),
    current_hospital_id UUID REFERENCES hospitals(id),
    recommended_hospital_id UUID REFERENCES hospitals(id),
    decision reroute_decision NOT NULL,
    reason TEXT NOT NULL,
    current_hospital_eta INT, -- minutes
    recommended_hospital_eta INT, -- minutes
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Referral Audit Log Events
CREATE TABLE IF NOT EXISTS referral_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    actor_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

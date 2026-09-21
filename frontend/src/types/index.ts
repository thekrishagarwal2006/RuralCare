export type UserRole = 'PHC_DOCTOR' | 'HOSPITAL_STAFF' | 'AMBULANCE_OPERATOR' | 'COMMAND_CENTER' | 'ADMIN';

export type ReferralStatus = 'PENDING' | 'ACCEPTED' | 'IN_TRANSIT' | 'AT_RISK' | 'REROUTING' | 'COMPLETED' | 'CANCELLED';

export type RerouteDecision = 'CONTINUE' | 'WAIT_AND_STABILIZE' | 'REROUTE';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  associated_entity_id?: string;
  created_at: string;
}

export interface PHCCenter {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  contact_number: string;
}

export interface HospitalResource {
  id: string;
  hospital_id: string;
  icu_total: number;
  icu_occupied: number;
  icu_available: number;
  general_beds_total: number;
  general_beds_occupied: number;
  general_beds_available: number;
  ventilators_total: number;
  ventilators_occupied: number;
  ventilators_available: number;
  oxygen_available: boolean;
  blood_units_available: number;
  emergency_doctors_available: number;
  specialists_available: number;
  last_updated: string;
}

export interface Hospital {
  id: string;
  name: string;
  district: string;
  state: string;
  tier: string;
  latitude: number;
  longitude: number;
  contact_number: string;
  is_active: boolean;
  resources?: HospitalResource;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact_number?: string;
  medical_history?: string;
}

export interface ReferralRequirement {
  requires_icu: boolean;
  requires_ventilator: boolean;
  requires_oxygen: boolean;
  requires_emergency_physician: boolean;
  specialist_type?: string;
}

export interface Referral {
  id: string;
  referral_code: string;
  patient_id: string;
  phc_id: string;
  origin_doctor_id?: string;
  assigned_hospital_id?: string;
  assigned_ambulance_id?: string;
  status: ReferralStatus;
  emergency_type: string;
  priority: string;
  symptoms: string;
  spo2?: number;
  heart_rate?: number;
  blood_pressure?: string;
  notes?: string;
  created_at: string;
  patient?: Patient;
  requirements?: ReferralRequirement;
  hospital?: Hospital;
  phc?: PHCCenter;
}

export interface HospitalCandidate {
  hospital?: Hospital;
  hospital_id: string;
  hospital_name: string;
  distance_km: number;
  eta_minutes: number;
  capability_match: boolean;
  missing_capabilities: string[];
  icu_available: number;
  ventilators_available: number;
  oxygen_available: boolean;
  score: number;
  recommendation_reason: string;
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  current_latitude: number;
  current_longitude: number;
  is_available: boolean;
}

export interface RerouteEvaluationResult {
  referral_id: string;
  referral_code: string;
  decision: RerouteDecision;
  reason: string;
  current_hospital_id: string;
  current_hospital_name: string;
  current_hospital_eta: number;
  recommended_hospital_id?: string;
  recommended_hospital_name?: string;
  recommended_hospital_eta?: number;
  status: string;
}

export interface ReferralEvent {
  id: string;
  referral_id: string;
  event_type: string;
  description: string;
  actor_id?: string;
  timestamp: string;
}

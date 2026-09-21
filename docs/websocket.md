# RuralCare WebSocket Architecture & Event Specifications

RuralCare uses a WebSocket communication bus with fallback support for Redis Pub/Sub or in-memory channel management.

## WebSocket Channels

- `/ws/hospital/{hospital_id}`: Dedicated channel for hospital dashboard updates.
- `/ws/ambulance/{ambulance_id}`: Dedicated channel for ambulance driver HUD and navigation alerts.
- `/ws/command-center`: Network-wide monitoring stream.

## Standard Message Envelope Format

```json
{
  "event_type": "RESOURCE_CHANGED | AMBULANCE_LOCATION_UPDATED | REFERRAL_STATUS_CHANGED | DESTINATION_RESOURCE_RISK | REROUTE_RECOMMENDED",
  "timestamp": "2026-09-20T12:00:00Z",
  "data": {}
}
```

## Example Event Payloads

### 1. Resource Changed (`RESOURCE_CHANGED`)
```json
{
  "event_type": "RESOURCE_CHANGED",
  "timestamp": "2026-09-20T12:00:00Z",
  "data": {
    "hospital_id": "hosp-pune-01",
    "hospital_name": "Sassoon General Hospital",
    "resource_name": "icu_occupied",
    "previous_value": 9,
    "new_value": 10,
    "icu_available": 0
  }
}
```

### 2. Destination Resource Risk Alert (`DESTINATION_RESOURCE_RISK`)
```json
{
  "event_type": "DESTINATION_RESOURCE_RISK",
  "timestamp": "2026-09-20T12:00:05Z",
  "data": {
    "referral_id": "ref-1001",
    "referral_code": "REF-2026-001",
    "patient_name": "Rajesh Kumar",
    "hospital_id": "hosp-pune-01",
    "missing_resource": "ICU Bed",
    "status": "AT_RISK"
  }
}
```

### 3. Reroute Recommendation (`REROUTE_RECOMMENDED`)
```json
{
  "event_type": "REROUTE_RECOMMENDED",
  "timestamp": "2026-09-20T12:00:08Z",
  "data": {
    "referral_id": "ref-1001",
    "decision": "REROUTE",
    "current_hospital_name": "Sassoon General Hospital",
    "recommended_hospital_name": "Sahyadri Super Speciality Hospital",
    "recommended_hospital_id": "hosp-pune-02",
    "old_eta_minutes": 18,
    "new_eta_minutes": 22,
    "reason": "Required ICU bed depleted at destination. Alternative hospital possesses 4 available ICU beds with +4 min ETA."
  }
}
```

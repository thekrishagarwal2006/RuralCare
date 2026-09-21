# RuralCare REST API Documentation

Base URL: `/api/v1`

## Authentication

- `POST /auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Response: `{ "access_token": "...", "token_type": "bearer", "user": {...} }`

## PHC & Referral APIs

- `GET /phc/centers`
  - Returns list of all Primary Health Centres.

- `POST /referrals`
  - Body: Patient details, emergency type, vitals (SpO2, HR, BP), symptoms text.
  - Response: Created referral object with parsed requirements.

- `POST /referrals/{id}/recommendations`
  - Body: `{ "latitude": ..., "longitude": ... }` (optional override)
  - Response: Ranked candidate hospitals with suitability scores, travel time, and resource availability matrix.

- `POST /referrals/{id}/accept`
  - Body: `{ "hospital_id": "..." }`
  - Assigns referral to hospital and sets status to `ACCEPTED`.

## Hospital Resource APIs

- `GET /hospitals`
  - Retrieves all registered hospitals with current resource states.

- `GET /hospitals/{id}/resources`
  - Returns detailed live resource counts for specified hospital.

- `PUT /hospitals/{id}/resources`
  - Body: Resource updates (e.g. `{ "icu_occupied": 10 }`).
  - Triggers database update, audit event creation, Redis publish, and WebSocket broadcast.

## Ambulance & Tracking APIs

- `POST /ambulances/{id}/assign`
  - Body: `{ "referral_id": "..." }`
  - Assigns ambulance to an active referral.

- `POST /ambulances/{id}/location`
  - Body: `{ "latitude": ..., "longitude": ..., "speed": ... }`
  - Pushes live GPS coordinate, updates location history, and checks for rerouting triggers.

## Rerouting & Decision APIs

- `POST /rerouting/evaluate`
  - Body: `{ "referral_id": "..." }`
  - Evaluates current ambulance location against destination hospital vs alternative hospitals. Returns decision recommendation (`CONTINUE`, `WAIT_AND_STABILIZE`, `REROUTE`) with rationale.

- `POST /rerouting/{referral_id}/accept`
  - Accepts recommended reroute, switching assigned hospital and recalculating route polyline.

## Command Centre Overview

- `GET /command-center/overview`
  - Returns aggregated network status, active emergency counts, ambulance locations, and live alerts.

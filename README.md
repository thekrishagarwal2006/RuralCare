# RuralCare: AI-Powered Predictive Rural Hospital Referral System

> **Real-Time Emergency Referral Coordination & Time-Aware Routing Engine**

RuralCare is an AI-assisted real-time emergency referral coordination and time-aware decision-support platform designed for rural healthcare networks.

---

## 1. Project Overview

In rural healthcare ecosystems, Primary Health Centres (PHCs) frequently encounter critical patients requiring treatment beyond local PHC capabilities. Selecting the nearest hospital is often suboptimal because resource availability (ICU beds, ventilators, oxygen manifolds, specialists) changes dynamically.

RuralCare provides continuous time-aware decision support, evaluating hospital suitability not only at dispatch time $T_0$, but continuously in real-time as ambulances travel toward destination hospitals.

---

## 2. Core Problem Statement

A hospital suitable at $T_0$ (e.g. Hospital A has 1 available ICU bed) can become unsuitable at $T_0 + 8\text{ min}$ when another emergency patient is admitted at Hospital A, depleting its last ICU bed while the ambulance is still 18 minutes away.

RuralCare dynamically detects this resource change in real time, publishes a sub-second WebSocket event across actor portals, and evaluates whether to:
1. **CONTINUE** to current hospital.
2. **WAIT_AND_STABILIZE** (if resource is predicted to free up near arrival time).
3. **REROUTE** to an alternative hospital (e.g. Hospital B with 4 available ICU beds, +4 min travel time).

---

## 3. Novel Contribution

- **Time-Aware Referral Decision Support**: Continuous real-time re-evaluation of emergency transport logistics against dynamic hospital state changes and predicted resource availability.
- **Sub-Second Event-Driven Architecture**: Decoupled Redis Pub/Sub & WebSocket event bus synchronizing 4 distinct actor portals without polling.
- **Predictive Resource Turnover Modeling**: Heuristic & ML ready interface estimating resource release probability within arrival travel windows.

---

## 4. System Architecture

```
+-----------------------------------------------------------------------+
|                          Presentation Layer                           |
|  React 18 + TypeScript + Tailwind CSS + Leaflet (OSM / GIS Rendering) |
|  Actors: PHC Doctor | Hospital Staff | Ambulance Driver | Command Ctr |
+-----------------------------------+-----------------------------------+
                                    |
                            REST API / WebSockets
                                    |
+-----------------------------------v-----------------------------------+
|                           Application Layer                           |
|                     FastAPI (Python 3.13) Engine                       |
|                                                                       |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Clinical AI Parser |  | Decision & Scoring |  | Reroute Engine  |  |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Resource Predictor |  | Geo / OSRM Router  |  | WebSocket Hub   |  |
|  +--------------------+  +--------------------+  +-----------------+  |
+-----------------------------------+-----------------------------------+
                                    |
                           ORMs & Event Streams
                                    |
+-----------------------------------v-----------------------------------+
|                            Persistence Layer                          |
|         PostgreSQL Database (Relational) + Redis (Pub/Sub Event Bus)  |
+-----------------------------------------------------------------------+
```

---

## 5. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Leaflet / React-Leaflet, Axios, Lucide Icons.
- **Backend**: Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Passlib, Python-Jose.
- **Database**: PostgreSQL (with PostGIS support) / SQLite local fallback.
- **Real-Time**: WebSockets, Redis Pub/Sub.
- **Maps & GIS**: OpenStreetMap, Leaflet, OSRM (Open Source Routing Machine) / Haversine fallback.
- **Containerization**: Docker, Docker Compose.

---

## 6. Database Architecture

The system utilizes 15 relational tables maintaining full integrity:
- `users`, `phc_centers`, `hospitals`, `hospital_resources`, `hospital_resource_events`
- `patients`, `referrals`, `referral_requirements`
- `ambulances`, `ambulance_locations`, `rerouting_decisions`, `referral_events`

See [`docs/database.md`](docs/database.md) for full ERD & field descriptions.

---

## 7. Key REST & WebSocket API Endpoints

- `POST /api/v1/auth/login`: Authenticate actor users.
- `POST /api/v1/referrals`: Create emergency referral ticket & run Clinical AI Parser.
- `POST /api/v1/referrals/{id}/recommendations`: Calculate ranked hospital candidate scores.
- `PUT /api/v1/hospitals/{id}/resources`: Update live inventory (triggers real-time event pipeline).
- `POST /api/v1/ambulances/{id}/location`: Push GPS location tick.
- `POST /api/v1/rerouting/evaluate`: Execute dynamic rerouting decision logic.
- `WebSocket /ws/command-center`: Central network monitoring feed.

See [`docs/api.md`](docs/api.md) and [`docs/websocket.md`](docs/websocket.md) for full documentation.

---

## 8. Dynamic Rerouting Logic

Hospital suitability score formula:

$$\text{Score} = W_{\text{cap}} \cdot S_{\text{capability}} + W_{\text{avail}} \cdot S_{\text{resource}} + W_{\text{pred}} \cdot S_{\text{prediction}} - W_{\text{time}} \cdot T_{\text{travel\_min}} - W_{\text{load}} \cdot L_{\text{hospital\_pct}}$$

Rerouting Decision Pipeline:
1. Hospital administrator decrements ICU beds $1 \to 0$.
2. Backend saves state, logs resource event, and publishes Redis event.
3. System identifies active in-transit referrals assigned to this hospital requiring ICU.
4. Rerouting Engine queries current ambulance GPS coordinates.
5. Re-evaluates destination vs candidate hospitals.
6. Emits `REROUTE_RECOMMENDED` decision with rationale to Ambulance HUD and Command Centre.

See [`docs/rerouting-algorithm.md`](docs/rerouting-algorithm.md) for details.

---

## 9. Local Development & Docker Instructions

### Method A: Running with Docker Compose (Recommended)

```bash
docker-compose up --build
```

Access Applications:
- **Frontend Portal**: `http://localhost:3000` (or proxy via Vite)
- **Backend Swagger API Docs**: `http://localhost:8000/docs`

### Method B: Local Python & Node Execution

1. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python seed.py
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 10. System Walkthrough & Demo Scenario

1. **Sign In**: Log in as PHC Doctor (`phc_doctor1` / `doctor123`).
2. **Create Referral**: Input Patient (54yo Male, Respiratory Distress, SpO2 82%). Click **Find Suitable Hospital**.
3. **Select Hospital**: Sassoon General Hospital (Hospital A) selected as #1 match with 1 ICU bed. Confirm referral.
4. **Start Ambulance Trip**: Log in as `driver1` or open Command Centre. Click **Start Simulation Trip**.
5. **Trigger Resource Failure**: In Demo Control Panel, click **Deplete ICU (1 → 0)** for Sassoon Hospital.
6. **Observe Real-Time Reaction**:
   - Sub-second alert: `DESTINATION RESOURCE AT RISK` appears on Ambulance & Command Centre.
   - Rerouting Engine recommends `REROUTE TO SAHYADRI HOSPITAL (HOSPITAL B)` with +4 min ETA difference rationale.
7. **Accept Reroute**: Click **Accept Reroute**. Map polyline updates live to Sahyadri Hospital.

See [`docs/system-demo.md`](docs/system-demo.md) for full presentation script.

---

## 11. System Architecture & Roadmap

### Core Platform Capabilities
- Rule-based clinical NLP parser and heuristic turnover predictor.
- Continuous GPS waypoint movement and time-aware rerouting engine.

### Future Roadmap
- Integration with Whisper voice input & Gemini/GPT-4 clinical extraction.
- Trained ML-based predictive resource availability models.
- Push notifications via FCM.
- Multi-ambulance fleet coordination.

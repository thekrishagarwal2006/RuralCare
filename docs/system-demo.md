# RuralCare System Demonstration Guide

This guide outlines the step-by-step presentation script to demonstrate the platform.

## Demo Credentials & Accounts

| Role | Username | Password | Default Entity / Location |
|---|---|---|---|
| PHC Doctor | `phc_doctor1` | `doctor123` | Shirur Primary Health Centre |
| Hospital Staff (Hosp A) | `hosp_admin1` | `hosp123` | Sassoon General Hospital |
| Hospital Staff (Hosp B) | `hosp_admin2` | `hosp123` | Sahyadri Super Speciality |
| Ambulance Operator | `driver1` | `driver123` | Ambulance MH-12-AM-1001 |
| Command Centre | `command1` | `command123` | Central Emergency Command |

## Demonstration Sequence (10 Minutes)

1. **PHC Referral Dispatch**
   - Log in as `phc_doctor1`.
   - Open PHC Dashboard $\rightarrow$ Click **Create New Referral**.
   - Input Patient: Age 54, Respiratory Distress, SpO2: 82%, HR: 118, BP: 90/60.
   - Clinical parser highlights required resources: `[ICU, OXYGEN, VENTILATOR, EMERGENCY_PHYSICIAN]`.
   - Click **Find Suitable Hospital**. View candidate list sorted by suitability score.
   - Confirm referral to **Sassoon General Hospital (Hospital A)**.

2. **Hospital A Acceptance & Dispatch**
   - Log in as `hosp_admin1` in a side window. Notice live alert. Click **Accept Referral**.
   - Assign Ambulance `MH-12-AM-1001`.

3. **Ambulance Live Tracking & GPS Simulation**
   - Log in as `driver1` or open **Command Centre Dashboard**.
   - Click **Start Simulation Trip**.
   - The map displays Ambulance `MH-12-AM-1001` moving along route toward Sassoon Hospital. Total ETA = 18 minutes.

4. **Resource Failure & Dynamic Rerouting Trigger (Key Milestone)**
   - Open **Hospital Resource Management / Demo Control Panel**.
   - Sassoon Hospital ICU beds: Change **Available ICU from 1 to 0** and click **Update Inventory**.
   - **Observe Real-Time System Reaction**:
     - Hospital updates database $\rightarrow$ Redis Publishes event $\rightarrow$ WebSockets push alert.
     - Ambulance HUD flashes: `DESTINATION RESOURCE AT RISK: ICU Bed Depleted`.
     - Command Centre alerts: `Alert: Active Referral REF-2026-001 Destination Resource Unmet`.
     - Rerouting Engine automatically computes decision from current ambulance coordinates to Sahyadri Hospital (Hospital B).
     - Decision Banner displays: `RECOMMENDATION: REROUTE TO SAHYADRI HOSPITAL`. Reason: "Required ICU bed depleted at destination. Alternative hospital provides 4 ICU beds (+4 min ETA)."

5. **Accept Reroute & Live Path Update**
   - Click **Accept Reroute** on Ambulance portal.
   - Leaflet map updates route polyline instantly to Sahyadri Hospital (Hospital B).
   - Command Centre updates active referral path and destination.
   - Sahyadri Hospital (`hosp_admin2`) receives rerouted referral ticket.
   - Open **Audit Log Page** to review logged entries.

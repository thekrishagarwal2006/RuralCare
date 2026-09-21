# RuralCare Database Schema & Relational Design

The database uses PostgreSQL (with PostGIS support for spatial queries) and SQLAlchemy ORM for cross-database compatibility (PostgreSQL / SQLite).

## Entity-Relationship Diagram Summary

```
[Patient] ----< [Referral] >---- [PHC Center]
                   |     \
                   |      \----> [Referral Requirements]
                   |
                   +-----> [Hospital] ----< [Hospital Resources]
                   |           ^                  |
                   |           |                  v
                   |           +------- [Resource Events]
                   v                              |
             [Ambulance]                          v
                 |                      [Rerouting Decisions]
                 v                                |
     [Ambulance Location History]                 v
                                         [Audit Event Logs]
```

## Entity Details

- **Users**: Authentication & RBAC (`PHC_DOCTOR`, `HOSPITAL_STAFF`, `AMBULANCE_OPERATOR`, `COMMAND_CENTER`, `ADMIN`).
- **PHC Centers**: Geographical location, district info, contact details.
- **Hospitals**: Location coordinates, tier classification, operational status.
- **Hospital Resources**: Live inventory tracking ICU beds, General beds, Ventilators, Oxygen state, Blood availability, Doctors, and Specialists.
- **Hospital Resource Events**: Immutably appends state changes whenever hospital staff alters resource levels.
- **Patients**: Medical records, symptoms, vitals history.
- **Referrals**: State machine (`PENDING`, `ACCEPTED`, `IN_TRANSIT`, `AT_RISK`, `REROUTING`, `COMPLETED`).
- **Referral Requirements**: Boolean feature flags and specialist demand parsed from clinical symptoms.
- **Ambulances**: GPS coordinates, speed, heading, assigned vehicle information.
- **Rerouting Decisions**: Records evaluation rationale (`CONTINUE`, `WAIT_AND_STABILIZE`, `REROUTE`), ETA differences, and target hospitals.
- **Referral Events**: Comprehensive audit logging for all lifecycle transitions.

# Dynamic Time-Aware Rerouting Algorithm Specifications

## Core Motivation

In emergency medical logistics within rural networks, hospital resource states are dynamic. A hospital suitable at dispatch time $T_0$ can become unsuitable before the ambulance reaches it at $T_{\text{arrival}}$.

RuralCare solves this by executing a continuous continuous re-evaluation algorithm when any hospital resource change event occurs during transit.

## Decision Matrix & Algorithm Logic

```
   Resource Change Event at Destination Hospital
                      │
                      ▼
   Is required resource depleted? (e.g. ICU = 0)
         │                         │
        NO                        YES
         │                         │
         ▼                         ▼
      CONTINUE             Calculate Ambulance Current Position (lat, lng)
                           Calculate ETA to Current Hospital (ETA_curr)
                           Predict Resource Availability Time at Current (T_avail)
                           
                           Query Alternative Candidate Hospitals matching requirements
                           Calculate ETA to Candidates from Current Position (ETA_alt)
                                   │
                                   ├───────────────────────────────┐
                                   ▼                               ▼
                      T_avail <= ETA_curr + 5 min?    ETA_alt <= MAX_ACCEPTABLE_TIME?
                                   │                               │
                                  YES                             YES
                                   │                               │
                                   ▼                               ▼
                         WAIT_AND_STABILIZE                     REROUTE
```

## Mathematical Scoring Formula for Hospital Recommendation

$$\text{Score}(H) = W_{\text{cap}} \cdot S_{\text{capability}} + W_{\text{avail}} \cdot S_{\text{resource}} + W_{\text{pred}} \cdot S_{\text{prediction}} - W_{\text{time}} \cdot T_{\text{travel\_min}} - W_{\text{load}} \cdot L_{\text{hospital\_pct}}$$

Where:
- $S_{\text{capability}} \in [0, 1]$: Mandatory requirement match (1.0 if all met, 0.0 otherwise).
- $S_{\text{resource}} \in [0, 1]$: Ratio of available beds/equipment.
- $S_{\text{prediction}} \in [0, 1]$: Probability of resource availability at estimated arrival time.
- $T_{\text{travel\_min}}$: Estimated travel duration in minutes from current position.
- $L_{\text{hospital\_pct}}$: Hospital occupancy percentage.

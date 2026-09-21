# RuralCare System Architecture

RuralCare is an AI-assisted real-time emergency hospital referral coordination and time-aware decision support system designed for rural healthcare ecosystems.

## High-Level Architectural Layers

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

## Core Architectural Design Principles

1. **Decoupled Real-Time Communication**: Uses WebSockets with Redis Pub/Sub fallback to maintain instant sub-second synchronization across all 4 actor portals without polling.
2. **Time-Aware Decision Support**: Rather than evaluating hospital suitability solely at referral creation, RuralCare continuously re-evaluates hospital resource states against ambulance ETA throughout transit.
3. **Modular Clinical AI**: Provides a clean interface layer (`ClinicalParserInterface`) enabling rule-based parsing for offline/prototype runtimes, while allowing plug-and-play integration with LLMs (Gemini, GPT-4) or Whisper voice input.
4. **Resilient GIS & Distance Routing**: Employs OSRM routing calculations with local spherical Haversine fallback to guarantee route & ETA calculations even under network isolation.

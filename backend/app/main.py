from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.models import User
from app.api import auth, phc, hospitals, referrals, ambulances, rerouting, command_center, demo
from app.websocket.connection_manager import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise Database Tables
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed database if empty (ensures deployed servers have preset accounts out-of-the-box!)
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        if user_count == 0:
            print("Auto-seeding database on startup...")
            from seed import seed_database
            seed_database()
    except Exception as e:
        print(f"Auto-seed check skipped/failed: {e}")

    await ws_manager.init_redis()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="RuralCare AI-Powered Emergency Hospital Referral & Rerouting API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(phc.router, prefix="/api/v1")
app.include_router(hospitals.router, prefix="/api/v1")
app.include_router(referrals.router, prefix="/api/v1")
app.include_router(ambulances.router, prefix="/api/v1")
app.include_router(rerouting.router, prefix="/api/v1")
app.include_router(command_center.router, prefix="/api/v1")
app.include_router(demo.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

# Real-Time WebSocket Endpoints
@app.websocket("/ws/hospital/{hospital_id}")
async def websocket_hospital(websocket: WebSocket, hospital_id: str):
    channel = f"hospital/{hospital_id}"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)

@app.websocket("/ws/ambulance/{ambulance_id}")
async def websocket_ambulance(websocket: WebSocket, ambulance_id: str):
    channel = f"ambulance/{ambulance_id}"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)

@app.websocket("/ws/command-center")
async def websocket_command_center(websocket: WebSocket):
    channel = "command-center"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel)

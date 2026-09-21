import json
import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket
import redis.asyncio as aioredis
from app.core.config import settings

class ConnectionManager:
    def __init__(self):
        # Channels: channel_name -> Set[WebSocket]
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.redis: aioredis.Redis = None

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = set()
        self.active_connections[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def broadcast(self, channel: str, message: dict):
        # 1. Local WebSocket broadcast
        payload = json.dumps(message)
        if channel in self.active_connections:
            disconnected = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, channel)

        # 2. Also broadcast to broadcast-all / command-center if channel != command-center
        if channel != "command-center" and "command-center" in self.active_connections:
            for connection in self.active_connections["command-center"]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

    async def init_redis(self):
        try:
            self.redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await self.redis.ping()
        except Exception:
            self.redis = None # Use in-memory fallback if Redis is offline

    async def publish_event(self, channel: str, event_type: str, data: dict):
        event_payload = {
            "event_type": event_type,
            "channel": channel,
            "data": data
        }
        # If Redis is connected, publish via Redis
        if self.redis:
            try:
                await self.redis.publish(channel, json.dumps(event_payload))
            except Exception:
                pass
        
        # Broadcast locally
        await self.broadcast(channel, event_payload)

ws_manager = ConnectionManager()

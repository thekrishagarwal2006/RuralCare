import math
import httpx
from app.core.config import settings

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great circle distance between two points in kilometers."""
    R = 6371.0 # Earth's radius in km

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return round(distance, 2)

def estimate_eta_minutes(distance_km: float, average_speed_kmh: float = 45.0) -> int:
    """Estimates emergency travel duration in minutes based on average ambulance speed."""
    if distance_km <= 0:
        return 1
    hours = distance_km / average_speed_kmh
    minutes = math.ceil(hours * 60)
    return max(1, minutes)

async def get_osrm_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    """Fetches real road distance, duration, and route polyline from OSRM with local fallback."""
    url = f"{settings.OSRM_SERVER_URL}/route/v1/driving/{start_lon},{start_lat};{end_lon},{end_lat}?overview=full&geometries=geojson"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("routes"):
                    route = data["routes"][0]
                    distance_km = round(route["distance"] / 1000.0, 2)
                    duration_min = max(1, math.ceil(route["duration"] / 60.0))
                    coordinates = route["geometry"]["coordinates"] # [[lon, lat], ...]
                    polyline = [[coord[1], coord[0]] for coord in coordinates] # [[lat, lon], ...]
                    return {
                        "distance_km": distance_km,
                        "eta_minutes": duration_min,
                        "polyline": polyline
                    }
    except Exception:
        pass # Fallback to Haversine straight line approximation on network failure

    dist_km = haversine_distance_km(start_lat, start_lon, end_lat, end_lon)
    eta_min = estimate_eta_minutes(dist_km)
    polyline = [[start_lat, start_lon], [end_lat, end_lon]]
    return {
        "distance_km": dist_km,
        "eta_minutes": eta_min,
        "polyline": polyline
    }

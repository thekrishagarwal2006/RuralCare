/**
 * Geospatial utilities for OSRM route parsing, distance calculations,
 * bearing angle computation, and smooth polyline interpolation.
 */

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculates the great circle distance between two points in kilometers.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates distance in meters between two lat/lon points.
 */
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Calculates initial bearing (heading angle) from point 1 to point 2 in degrees (0..360).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);
  return (bearingDeg + 360) % 360;
}

/**
 * Calculates cumulative distance in meters at each coordinate along a polyline.
 * Returns an array `cumDist` of length `polyline.length`.
 */
export function calculateCumulativeDistances(polyline: [number, number][]): number[] {
  if (!polyline || polyline.length === 0) return [0];

  const cumDist: number[] = [0];
  let total = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lon1] = polyline[i];
    const [lat2, lon2] = polyline[i + 1];
    const segMeters = haversineDistanceMeters(lat1, lon1, lat2, lon2);
    total += segMeters;
    cumDist.push(total);
  }

  return cumDist;
}

export interface InterpolatedPoint {
  latitude: number;
  longitude: number;
  heading: number;
  segmentIndex: number;
  totalDistanceMeters: number;
  distanceTraveledMeters: number;
  completedPath: [number, number][];
  remainingPath: [number, number][];
  isFinished: boolean;
}

/**
 * Interpolates exact position and heading along polyline for a given distance traveled in meters.
 */
export function interpolatePolylinePosition(
  polyline: [number, number][],
  cumDistances: number[],
  distanceTraveledMeters: number
): InterpolatedPoint {
  if (!polyline || polyline.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      heading: 0,
      segmentIndex: 0,
      totalDistanceMeters: 0,
      distanceTraveledMeters: 0,
      completedPath: [],
      remainingPath: [],
      isFinished: true,
    };
  }

  const totalDistanceMeters = cumDistances[cumDistances.length - 1] || 0;

  if (polyline.length === 1 || distanceTraveledMeters <= 0) {
    const [lat, lon] = polyline[0];
    const heading = polyline.length > 1 ? calculateBearing(lat, lon, polyline[1][0], polyline[1][1]) : 0;
    return {
      latitude: lat,
      longitude: lon,
      heading,
      segmentIndex: 0,
      totalDistanceMeters,
      distanceTraveledMeters: 0,
      completedPath: [polyline[0]],
      remainingPath: [...polyline],
      isFinished: false,
    };
  }

  if (distanceTraveledMeters >= totalDistanceMeters) {
    const lastIdx = polyline.length - 1;
    const [lat, lon] = polyline[lastIdx];
    const prevPt = polyline[lastIdx - 1] || polyline[lastIdx];
    const heading = calculateBearing(prevPt[0], prevPt[1], lat, lon);
    return {
      latitude: lat,
      longitude: lon,
      heading,
      segmentIndex: lastIdx - 1,
      totalDistanceMeters,
      distanceTraveledMeters: totalDistanceMeters,
      completedPath: [...polyline],
      remainingPath: [polyline[lastIdx]],
      isFinished: true,
    };
  }

  // Find segment index i where cumDistances[i] <= distanceTraveledMeters < cumDistances[i+1]
  let i = 0;
  while (i < cumDistances.length - 1 && cumDistances[i + 1] <= distanceTraveledMeters) {
    i++;
  }

  const segStartDist = cumDistances[i];
  const segEndDist = cumDistances[i + 1];
  const segLen = segEndDist - segStartDist;

  const [lat1, lon1] = polyline[i];
  const [lat2, lon2] = polyline[i + 1];

  const ratio = segLen > 0 ? (distanceTraveledMeters - segStartDist) / segLen : 0;
  const currentLat = lat1 + (lat2 - lat1) * ratio;
  const currentLon = lon1 + (lon2 - lon1) * ratio;
  const heading = calculateBearing(lat1, lon1, lat2, lon2);

  const completedPath: [number, number][] = polyline.slice(0, i + 1);
  completedPath.push([currentLat, currentLon]);

  const remainingPath: [number, number][] = [[currentLat, currentLon], ...polyline.slice(i + 1)];

  return {
    latitude: currentLat,
    longitude: currentLon,
    heading,
    segmentIndex: i,
    totalDistanceMeters,
    distanceTraveledMeters,
    completedPath,
    remainingPath,
    isFinished: false,
  };
}

const RAD = Math.PI / 180;
const EARTH_RADIUS = 6371008.8;

/**
 * Haversine distance between two [lng, lat] points in meters.
 */
export function calcDistance(
  a: [number, number],
  b: [number, number]
): number {
  const dLat = (b[1] - a[1]) * RAD;
  const dLng = (b[0] - a[0]) * RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * sinLng * sinLng;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Approximate area of a GeoJSON Polygon feature in square meters.
 */
export function calcArea(feature: { geometry?: { type?: string; coordinates?: number[][][] } }): number {
  if (!feature.geometry || feature.geometry.type !== "Polygon" || !feature.geometry.coordinates) {
    return 0;
  }
  const coords = feature.geometry.coordinates[0];
  if (!coords || coords.length < 4) return 0;

  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    total += (lng2 - lng1) * RAD * (2 + Math.sin(lat1 * RAD) + Math.sin(lat2 * RAD));
  }
  total = Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
  return total;
}

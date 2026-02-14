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

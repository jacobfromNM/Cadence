// Returns distance in meters between two {latitude, longitude} points.
export function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude  - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const sinLat = Math.sin(dLat / 2)
  const sinLon = Math.sin(dLon / 2)
  const c = sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c))
}

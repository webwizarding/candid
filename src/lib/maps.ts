export function googleMapsUrl(location: string, directions = false) {
  const value = location.trim().slice(0, 2000);
  return directions
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}&travelmode=walking`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

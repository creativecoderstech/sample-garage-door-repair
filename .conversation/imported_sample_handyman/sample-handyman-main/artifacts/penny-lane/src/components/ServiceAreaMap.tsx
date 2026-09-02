import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Canton, GA (30115) — home base. */
const CENTER: [number, number] = [34.2368, -84.4544];
/** ~20 mile service radius, in meters. */
const RADIUS_METERS = 20 * 1609.34;

export function ServiceAreaMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
    });
    mapRef.current = map;
    // A view must exist before circle.getBounds() can be computed.
    map.setView(CENTER, 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const circle = L.circle(CENTER, {
      radius: RADIUS_METERS,
      color: 'hsl(25, 85%, 52%)',
      weight: 2,
      fillColor: 'hsl(25, 85%, 52%)',
      fillOpacity: 0.15,
    }).addTo(map);

    const marker = L.marker(CENTER, {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;border-radius:9999px;background:hsl(152,65%,28%);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    }).addTo(map);
    marker.bindPopup('<b>Penny Lane Home Solutions</b><br/>Based in Canton, GA — serving ~20 miles around.');

    map.fitBounds(circle.getBounds(), { padding: [20, 20] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[24rem]"
      data-testid="map-service-area"
      aria-label="Map highlighting the 20-mile service area around Canton, GA"
    />
  );
}

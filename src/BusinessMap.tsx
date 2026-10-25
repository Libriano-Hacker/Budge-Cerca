import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Business, Coordinates } from "./domain";

export default function BusinessMap({
  businesses,
  origin,
  onSelect,
}: {
  businesses: Business[];
  origin: Coordinates | null;
  onSelect: (business: Business) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current).setView([-34.7203, -58.4555], 15);
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      },
    ).addTo(map);
    let loaded = 0;
    tiles.on("tileload", () => {
      loaded++;
      setTileError(false);
    });
    tiles.on("tileerror", () => {
      if (!loaded) setTileError(true);
    });
    const points: L.LatLngTuple[] = [];
    businesses.forEach((b) => {
      const label = document.createElement("span");
      label.className = "map-marker-label";
      label.textContent = b.initials || b.name.slice(0, 2);
      const marker = L.marker([b.coordinates.lat, b.coordinates.lng], {
        icon: L.divIcon({
          html: label,
          className: "business-marker",
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        }),
        keyboard: true,
        title: `Ver ${b.name}`,
        alt: b.name,
      }).addTo(map);
      const tooltip = document.createElement("span");
      tooltip.textContent = b.name;
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -35] });
      marker.on("click", () => onSelect(b));
      points.push([b.coordinates.lat, b.coordinates.lng]);
    });
    if (origin) {
      L.circleMarker([origin.lat, origin.lng], {
        radius: 9,
        fillColor: "#dc8558",
        color: "white",
        weight: 3,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip("Tu ubicación");
      points.push([origin.lat, origin.lng]);
    }
    if (points.length)
      map.fitBounds(points, { padding: [45, 45], maxZoom: 16 });
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [businesses, origin, onSelect]);
  return (
    <div className="map-wrapper">
      {tileError && (
        <p className="gps-message" role="status">
          No pudimos cargar el fondo del mapa. Revisá la conexión; podés tocar
          un marcador y usar «Cómo llegar» para abrir Google Maps.
        </p>
      )}
      <div
        ref={container}
        className="business-map"
        role="region"
        aria-label="Mapa de comercios"
      />
      <p className="map-note">
        Tocá un marcador para ver el comercio. Las ubicaciones de muestra son
        ilustrativas. El mapa requiere conexión.
      </p>
    </div>
  );
}

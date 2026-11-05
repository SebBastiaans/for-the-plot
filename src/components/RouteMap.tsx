import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(workerUrl);

export type MapStop = { id: string; name: string; lat: number; lng: number; position: number };
export type MapPin = { id: string; stopId: string; label: string };

export default function RouteMap({ stops, pins }: { stops: MapStop[]; pins: MapPin[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || stops.length === 0) return;
    const line = getComputedStyle(document.documentElement).getPropertyValue("--map-line").trim() || "#a0c49d";
    const map = new maplibregl.Map({
      container: el.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [stops[0]!.lng, stops[0]!.lat],
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) },
        },
      });
      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        paint: { "line-color": line, "line-width": 3, "line-dasharray": [2, 1.5] },
      });
    });

    stops.forEach((s, i) => {
      const m = document.createElement("div");
      m.className = "route-stop";
      m.textContent = String(i + 1);
      Object.assign(m.style, {
        width: "26px", height: "26px", borderRadius: "999px", background: line, color: "#10261b",
        display: "grid", placeItems: "center", font: "700 12px Manrope, sans-serif", boxShadow: "0 0 0 4px rgba(160,196,157,.25)",
      });
      const count = pins.filter((p) => p.stopId === s.id).length;
      const html = `<b>${s.name}</b>${count ? `<br/>${count} photo/video${count === 1 ? "" : "s"}, note${count === 1 ? "" : "s"}` : ""}`;
      new maplibregl.Marker({ element: m })
        .setLngLat([s.lng, s.lat])
        .setPopup(new maplibregl.Popup({ offset: 16 }).setHTML(`<div style="color:#10261b">${html}</div>`))
        .addTo(map);
    });

    if (stops.length > 1) {
      const b = new maplibregl.LngLatBounds();
      stops.forEach((s) => b.extend([s.lng, s.lat]));
      map.fitBounds(b, { padding: 60, duration: 0, maxZoom: 9 });
    }
    return () => map.remove();
  }, [stops, pins]);

  return <div ref={el} className="h-full w-full" />;
}

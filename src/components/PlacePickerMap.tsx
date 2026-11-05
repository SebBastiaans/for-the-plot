import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(workerUrl);

type P = { lat: number; lng: number };

export default function PlacePickerMap({ places, active, onHover, onPick }: {
  places: P[]; active: number | null; onHover: (i: number | null) => void; onPick: (i: number) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const markers = useRef<HTMLElement[]>([]);
  const cb = useRef({ onHover, onPick });
  cb.current = { onHover, onPick };

  useEffect(() => {
    if (!el.current || places.length === 0) return;
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const map = new maplibregl.Map({
      container: el.current,
      style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
      cooperativeGestures: true,
      center: [places[0]!.lng, places[0]!.lat],
      zoom: 5,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    markers.current = places.map((p, i) => {
      // outer element is positioned by the map; only the inner dot is scaled
      const wrap = document.createElement("button");
      wrap.type = "button";
      wrap.setAttribute("aria-label", `Result ${i + 1}`);
      wrap.className = "h-7 w-7";
      const b = document.createElement("span");
      b.textContent = String(i + 1);
      b.className = "grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-sage text-xs font-bold text-primary-foreground shadow transition-transform";
      wrap.appendChild(b);
      wrap.onmouseenter = () => cb.current.onHover(i);
      wrap.onmouseleave = () => cb.current.onHover(null);
      wrap.onclick = () => cb.current.onPick(i);
      new maplibregl.Marker({ element: wrap }).setLngLat([p.lng, p.lat]).addTo(map);
      return b;
    });
    if (places.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      places.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 10, duration: 0 });
    } else map.setZoom(9);
    return () => map.remove();
  }, [places]);

  useEffect(() => {
    markers.current.forEach((b, i) => {
      b.style.transform = i === active ? "scale(1.35)" : "";
      if (b.parentElement) b.parentElement.style.zIndex = i === active ? "10" : "";
    });
  }, [active]);

  return <div ref={el} className="h-48 w-full overflow-hidden rounded-xl border border-border sm:h-56" />;
}

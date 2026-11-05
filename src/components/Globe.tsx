import { useEffect, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";

export type CountryStatus = { status: "visited" | "planned"; trips: number };

type Feature = { properties: { ISO_A2: string; NAME: string }; geometry: unknown };

const EARTH_IMG = "https://unpkg.com/three-globe@2.41.12/example/img/earth-blue-marble.jpg";
const BUMP_IMG = "https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png";

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
  return {
    visited: v("--globe-visited", "#7ee08a"),
    planned: v("--globe-planned", "#f5bb55"),
    stroke: v("--globe-stroke", "#e8ffe8"),
    atmosphere: v("--globe-atmosphere", "#7fb8ff"),
  };
}

/** hex (#rrggbb) + alpha → rgba() string */
function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export default function Globe({
  statuses,
  onCountryClick,
}: {
  statuses: Record<string, CountryStatus>;
  onCountryClick: (code: string) => void;
}) {
  const ref = useRef<GlobeMethods | undefined>(undefined);
  const wrap = useRef<HTMLDivElement>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [size, setSize] = useState({ w: 800, h: 700 });
  const [hover, setHover] = useState<string | null>(null);
  const [colors, setColors] = useState(readColors);

  // follow the device's light/dark switch live
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setColors(readColors());
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((r) => r.json())
      .then((d) => setFeatures(d.features));
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    // Let the mouse wheel scroll the page instead of zooming the globe.
    const stop = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", stop, { capture: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", stop, { capture: true });
    };
  }, []);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = !hover;
    c.autoRotateSpeed = 0.5;
    c.enableZoom = false;
  }, [hover, features]);

  // fixed camera distance so the globe fills its box and never changes size
  useEffect(() => {
    ref.current?.pointOfView({ lat: 25, lng: 10, altitude: 1.55 }, 0);
  }, [features]);

  const statusColor = (code: string) => {
    const s = statuses[code];
    return s ? (s.status === "visited" ? colors.visited : colors.planned) : null;
  };

  return (
    <div
      ref={wrap}
      tabIndex={0}
      aria-label="Interactive globe of the countries we've visited — drag to spin"
      className="globe-touch h-full w-full cursor-grab rounded-full active:cursor-grabbing"
    >
      <GlobeGL
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={EARTH_IMG}
        bumpImageUrl={BUMP_IMG}
        showAtmosphere
        atmosphereColor={colors.atmosphere}
        atmosphereAltitude={0.18}
        polygonsData={features}
        polygonsTransitionDuration={200}
        polygonAltitude={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          return code === hover ? 0.03 : statuses[code] ? 0.012 : 0.004;
        }}
        polygonCapColor={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          const c = statusColor(code);
          if (!c) return code === hover ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0)";
          return alpha(c, code === hover ? 0.75 : 0.5);
        }}
        polygonSideColor={(f: object) => {
          const c = statusColor((f as Feature).properties.ISO_A2);
          return c ? alpha(c, 0.35) : "rgba(0,0,0,0)";
        }}
        polygonStrokeColor={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          return statuses[code] ? colors.stroke : "rgba(255,255,255,0.18)";
        }}
        polygonLabel={(f: object) => {
          const p = (f as Feature).properties;
          const s = statuses[p.ISO_A2];
          const sub = s
            ? s.status === "visited"
              ? `${s.trips} trip${s.trips === 1 ? "" : "s"} · tap to open`
              : "Planned trip ✈️"
            : "Not crossed off yet";
          return `<div style="font-family:Nunito,sans-serif;background:rgba(20,20,20,.92);padding:6px 12px;border-radius:14px;color:#fff;font-weight:700">${p.NAME}<br/><span style="opacity:.75;font-size:12px;font-weight:600">${sub}</span></div>`;
        }}
        onPolygonHover={(f: object | null) => setHover(f ? (f as Feature).properties.ISO_A2 : null)}
        onPolygonClick={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          if (statuses[code]) onCountryClick(code);
        }}
      />
    </div>
  );
}

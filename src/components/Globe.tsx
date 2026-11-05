import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

export type CountryStatus = { status: "visited" | "planned"; trips: number };

type Feature = { properties: { ISO_A2: string; NAME: string }; geometry: unknown };


function readColors() {
  const css = getComputedStyle(document.documentElement);
  const v = (n: string, f: string) => css.getPropertyValue(n).trim() || f;
  return {
    visited: v("--globe-visited", "#7ee08a"),
    planned: v("--globe-planned", "#f5bb55"),
    stroke: v("--globe-stroke", "#e8ffe8"),
    ocean: v("--globe-ocean", "#1d3b5c"),
    land: v("--globe-land", "#cfe6bf"),
    border: v("--globe-border", "#a9b9a0"),
    label: v("--globe-label", "#2b3a2e"),
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
    c.autoRotate = true;
    c.autoRotateSpeed = 0.5;
    c.enableZoom = false;
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }, [hover, features]);

  // stop spinning while grabbed, resume 5s after letting go
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const c = g.controls();
    let t: ReturnType<typeof setTimeout> | undefined;
    const start = () => { clearTimeout(t); c.autoRotate = false; };
    const end = () => { clearTimeout(t); t = setTimeout(() => (c.autoRotate = true), 5000); };
    c.addEventListener("start", start);
    c.addEventListener("end", end);
    return () => { clearTimeout(t); c.removeEventListener("start", start); c.removeEventListener("end", end); };
  }, [features]);

  // fixed camera distance so the globe fills its box and never changes size
  useEffect(() => {
    ref.current?.pointOfView({ lat: 25, lng: 10, altitude: 1.55 }, 0);
  }, [features]);

  const material = useMemo(
    () => {
      // simple landscape map (deserts, forests, ice, mountain shading) under the country shapes
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const map = new THREE.TextureLoader().load(`/textures/globe-${dark ? "dark" : "light"}.webp?v=4`);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 16;
      map.generateMipmaps = true;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      return new THREE.MeshPhongMaterial({ map, color: "#ffffff", emissive: "#ffffff", emissiveMap: map, emissiveIntensity: dark ? 0.35 : 0.25, shininess: 0 });
    },
    [colors.ocean],
  );

  // pulsing rings on every crossed-off country (centroid from the geometry's bbox)
  const rings = useMemo(() => {
    const out: { lat: number; lng: number; color: string }[] = [];
    for (const f of features) {
      const s = statuses[f.properties.ISO_A2];
      if (!s) continue;
      const g = f.geometry as { type: string; coordinates: number[][][] | number[][][][] };
      const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
      const ring = polys.reduce((a, b) => (b[0]!.length > a[0]!.length ? b : a))[0]!;
      const lng = ring.reduce((a, p) => a + p[0]!, 0) / ring.length;
      const lat = ring.reduce((a, p) => a + p[1]!, 0) / ring.length;
      out.push({ lat, lng, color: s.status === "visited" ? colors.visited : colors.planned });
    }
    return out;
  }, [features, statuses, colors]);

  // country names at their centroid, only for larger countries to keep it clean
  const labels = useMemo(() => {
    return features.flatMap((f) => {
      const g = f.geometry as { type: string; coordinates: number[][][] | number[][][][] };
      const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as number[][][][];
      const ring = polys.reduce((a, b) => (b[0]!.length > a[0]!.length ? b : a))[0]!;
      const lng = ring.reduce((a, p) => a + p[0]!, 0) / ring.length;
      const lat = ring.reduce((a, p) => a + p[1]!, 0) / ring.length;
      return [{ lat, lng, name: f.properties.NAME }];
    });
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
      className="globe-touch h-full w-full cursor-grab rounded-full bg-transparent active:cursor-grabbing"
    >
      <GlobeGL
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere={false}
        labelsData={labels}
        labelText={(l: object) => (l as { name: string }).name}
        labelSize={0.6}
        labelDotRadius={0}
        labelAltitude={0.004}
        labelResolution={2}
        labelColor={() => colors.label}
        ringsData={rings}
        ringColor={(r: object) => (t: number) => alpha((r as { color: string }).color, 1 - t)}
        ringMaxRadius={4}
        ringPropagationSpeed={2}
        ringRepeatPeriod={1400}
        polygonsData={features}
        polygonsTransitionDuration={200}
        polygonAltitude={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          return statuses[code] ? 0.004 : 0.001;
        }}
        polygonCapCurvatureResolution={1}
        polygonCapColor={(f: object) => {
          const c = statusColor((f as Feature).properties.ISO_A2);
          return c ? alpha(c, 0.6) : "rgba(0,0,0,0)";
        }}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          return statuses[code] ? colors.stroke : colors.border;
        }}
        polygonLabel={(f: object) => {
          const p = (f as Feature).properties;
          const s = statuses[p.ISO_A2];
          const sub = s
            ? s.status === "visited"
              ? `${s.trips} trip${s.trips === 1 ? "" : "s"} · tap to open`
              : "Planned trip"
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

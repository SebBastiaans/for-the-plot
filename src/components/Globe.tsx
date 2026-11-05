import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

export type CountryStatus = { status: "visited" | "planned"; trips: number };

type Feature = { properties: { ISO_A2: string; NAME: string }; geometry: unknown };

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
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

  const colors = useMemo(
    () => ({
      visited: cssVar("--globe-visited", "#a0c49d"),
      planned: cssVar("--globe-planned", "#e0b45c"),
      dim: cssVar("--globe-dim", "rgba(160,196,157,0.16)"),
      surface: cssVar("--globe-surface", "#10261b"),
      atmosphere: cssVar("--globe-atmosphere", "#a0c49d"),
    }),
    [],
  );

  const material = useMemo(
    () => new THREE.MeshPhongMaterial({ color: colors.surface, emissive: colors.surface, emissiveIntensity: 0.4, shininess: 0 }),
    [colors],
  );

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
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const c = g.controls();
    c.autoRotate = !hover;
    c.autoRotateSpeed = 0.5;
    c.enableZoom = true;
    c.minDistance = 180;
    c.maxDistance = 500;
  }, [hover, features]);

  return (
    <div ref={wrap} className="h-full w-full cursor-grab active:cursor-grabbing">
      <GlobeGL
        ref={ref}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor={colors.atmosphere}
        atmosphereAltitude={0.18}
        hexPolygonsData={features}
        hexPolygonResolution={3}
        hexPolygonMargin={0.55}
        hexPolygonUseDots
        hexPolygonAltitude={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          return statuses[code] ? (code === hover ? 0.03 : 0.015) : 0.005;
        }}
        hexPolygonColor={(f: object) => {
          const s = statuses[(f as Feature).properties.ISO_A2];
          if (!s) return colors.dim;
          return s.status === "visited" ? colors.visited : colors.planned;
        }}
        hexPolygonLabel={(f: object) => {
          const p = (f as Feature).properties;
          const s = statuses[p.ISO_A2];
          const sub = s
            ? s.status === "visited"
              ? `${s.trips} trip${s.trips === 1 ? "" : "s"} · click to open`
              : "Planned trip"
            : "Not visited yet";
          return `<div style="font-family:Manrope,sans-serif;background:rgba(16,38,27,.92);border:1px solid rgba(160,196,157,.35);padding:6px 10px;border-radius:8px;color:#f1efe2"><b>${p.NAME}</b><br/><span style="opacity:.7;font-size:12px">${sub}</span></div>`;
        }}
        onHexPolygonHover={(f: object) => setHover(f ? (f as Feature).properties.ISO_A2 : null)}
        onHexPolygonClick={(f: object) => {
          const code = (f as Feature).properties.ISO_A2;
          if (statuses[code]) onCountryClick(code);
        }}
      />
    </div>
  );
}

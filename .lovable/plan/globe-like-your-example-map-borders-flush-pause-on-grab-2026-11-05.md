# Globe like your example map, borders flush, pause on grab

## What changes
1. **Map look from your example**: bright blue ocean (lighter near the coast), fresh green land with soft hill and mountain shading, pale grey-white for deserts and high plateaus (Tibet, Iran, Sahara), small blue lakes, and thin lavender-grey country borders. Country names stay. Visited countries keep a green tint plus pulsing rings; planned stay amber. Dark mode gets a dimmed version of the same map.
2. **Borders flush with the globe**: outlines and colors sit directly on the surface, no floating gap.
3. **Pause while grabbing**: the globe stops while you hold it, stays still for 5 seconds after you let go, then spins again.
4. The whole map stays light (target under ~500 KB) and sharp.

## Technical details
- Regenerate `public/textures/globe-{light,dark}.webp` at 4096x2048: land mask from `countries.geojson` (no gaps), terrain shading from Natural Earth HYP_50M (hillshade from luminance), recolor: vegetation → greens, arid/high → pale grey; ocean radial blue with lighter coastal band (distance blur of land mask); lakes from HYP blue pixels inside land. Bump cache version.
- `Globe.tsx`: polygon altitude ~0.001 for all, stroke color lavender-grey token, no side walls.
- OrbitControls `start` → `autoRotate=false` + clear timer; `end` → 5000ms timeout → `autoRotate=true`; cleanup on unmount.

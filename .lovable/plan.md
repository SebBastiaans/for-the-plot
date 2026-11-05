# Classic atlas globe, borders flush

## What changes
1. **Classic atlas map**: light blue sea, cream land, and each country filled with a soft pastel color (sand, peach, sage) so neighbours differ, like a school atlas. No terrain patches or snow blobs. Thin grey borders, labels stay. Visited countries stay green and planned amber on top. Dark mode uses the same idea with muted, darker tones.
2. **Borders flush with the globe**: country outlines and colors sit directly on the surface, with no floating gap.
3. **Pause while grabbing**: the globe stops spinning while you hold it, stays still for 5 seconds after you let go, then resumes spinning.

## Technical details
- Regenerate `public/textures/globe-{light,dark}.webp` (4096x2048) by rasterizing `countries.geojson` with a 4-5 color pastel palette (greedy neighbour coloring), flat ocean `#bfe3f5`; bump cache version.
- `Globe.tsx`: polygon altitude to ~0.001 for all countries (visited too), no side walls; keep hover without lift.
- Controls `start` event: `autoRotate=false`, clear timer; `end` event: 5000ms timeout then `autoRotate=true`; cleanup on unmount.

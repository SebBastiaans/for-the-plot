# Sharper, cartoon-style globe, no hover outline

## What changes
1. **Cartoon landscape instead of a detailed photo**: redraw the globe's land as a few smooth, flat color zones (sand for deserts, soft green for forests and grassland, light brown for mountains, white for ice) with clean rounded edges, like an illustrated map. Because it's only a handful of flat colors, it stays sharp at a larger size while the file stays small (target: under ~400 KB per light/dark version), so it loads fast on phones.
2. **Crisp rendering**: smooth texture filtering and full screen sharpness on phones/retina screens, so nothing looks pixelated.
3. **No hover border**: hovering a country no longer lifts it or draws a lighter outline or tint. Visited and planned countries keep their colors; tapping a country still opens it.

## Technical details
- Rebuild `public/textures/globe-{light,dark}` at 4096x2048 from Natural Earth HYP_50M: classify into ~5 zones, blur + threshold for smooth edges (no speckle), flat ocean; save as WebP (palette-like content compresses very well), keep JPG fallback only if WebP fails.
- `Globe.tsx`: load `.webp`, `colorSpace = SRGBColorSpace`, `anisotropy = maxAnisotropy`, mipmaps on, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Remove `hover` from polygon altitude and cap color; keep hover state only for cursor/click.

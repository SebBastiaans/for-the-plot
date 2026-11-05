# Sharper globe, no hover outline

## What changes
1. **Sharper landscape**: regenerate the light and dark globe images at 8192x4096 (now 2048x1024, which looks blurry when stretched over a big globe), from the higher-detail Natural Earth source, keeping the same flat, simple colors. Enable texture smoothing (anisotropic filtering + mipmaps) and render at the device's full pixel density so it's crisp on phones/retina.
2. **No hover border**: hovering a country no longer raises it or draws a lighter outline/tint over it. Visited and planned countries keep their colors; the cursor still shows the country can be clicked.

## Technical details
- Rebuild `public/textures/globe-{light,dark}.jpg` from HYP_HR_SR_W (or HYP_50M upscaled with Lanczos if download fails), JPEG q≈85 to keep size reasonable.
- `Globe.tsx`: `map.anisotropy = renderer.capabilities.getMaxAnisotropy()`, `colorSpace = SRGBColorSpace`, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.
- Remove `hover` from polygon altitude and cap color; keep hover state only for cursor/click.

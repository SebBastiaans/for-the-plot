# Home page: bigger half-globe + "how it works" section

## What changes
1. **Centered intro text** - eyebrow, headline, short line, legend and sign-in button centered at the top of the screen.
2. **Bigger globe, sitting lower** - the globe is roughly 1.6x its current size and pushed down so only its top half shows below the text on the first screen. It keeps spinning and can still be grabbed and rotated.
3. **No zoom on scroll** - scrolling the page (mouse wheel / trackpad) no longer zooms the globe in or out; its size stays fixed. Drag-to-spin still works.
4. **New "How it works" section** - starts over the lower half of the globe and continues down the page. It fades from transparent into the dark green background so the globe sinks behind it. Contains 4 short cards:
   - Spin the globe - lit-up countries are where the crew has been
   - Log a trip - dates, route of cities, who came along
   - Fill the gallery - photos, videos and notes tagged to a place and time
   - Compare & plan - rankings between friends and upcoming trips with countdowns
   Plus a button: "Add a trip" (signed in) or "Join the crew" (signed out).
5. **Taller page** - the home page now scrolls: intro + half globe, then the how-it-works section, then (when signed in) the stats and recent trips that already exist.

6. **New color scheme (whole site)** - near-black backgrounds, white text and soft greys for cards and borders. The greens are used only to highlight: visited countries on the globe, buttons, numbers in stats, active filters and map routes. Amber stays for planned trips. The globe itself becomes dark charcoal with dim white dots; visited countries glow green.

## Technical details
- `src/styles.css`: rework tokens to neutral black/white (background ~#0b0b0b, cards ~#151515, borders grey, foreground off-white); primary/sage/moss stay green as accents; globe surface/dim/atmosphere tokens switched to charcoal/white; hero gradient becomes a subtle grey radial glow.
- `src/routes/index.tsx`: hero section ~100svh with centered text; globe wrapper absolutely positioned, width/height ~150vh-ish square, centered horizontally, top offset so its center lands near the bottom edge of the hero; hero `overflow-hidden` removed in favor of a parent wrapper clipping horizontal overflow only. New section with negative top margin and a `--gradient-fade` token (transparent to background) layered above the globe (`relative z-10`).
- `src/components/Globe.tsx`: `controls.enableZoom = false`; set a fixed camera distance via `pointOfView({ altitude })` once on load so the globe fills its larger box; keep pointer events for dragging.
- `src/styles.css`: add `--gradient-fade` token and `bg-fade` utility.

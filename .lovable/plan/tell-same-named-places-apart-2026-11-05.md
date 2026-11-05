# Tell same-named places apart

## What you'll see
When you search for a place (e.g. "General Luna" in the Philippines), each result shows:
- **The place name** in bold, with **its type** next to it (town, village, island, beach, etc.)
- **Where it is** on a second line: the province and region (e.g. "Surigao del Norte, Caraga"), with no coordinates
- **A small map** above the list showing every result as a numbered pin. Tap a result or a pin and it lights up in both places, so you can see where it is in the country before you add it.

The map follows light/dark mode and fits all results on screen. On phones it sits above the list at a comfortable size.

## Technical details
- `geocode()` in `src/lib/data.ts`: add `addressdetails=1`, return `type`/`class` and a short `region` label (county/state/region from the address, deduplicated), keep `limit=5`.
- New `PlacePickerMap` (MapLibre, lazy behind ClientOnly like RouteMap): numbered markers, fitBounds, highlight on hover/tap, click selects.
- In `TripForm.tsx`: two-line result rows (name + type, region subtitle), shared highlighted index between list and map.

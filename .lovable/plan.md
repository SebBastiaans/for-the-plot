# Multi-country trips, photo avatars, light/dark, realistic globe, playful theme

## 1. Trips across multiple countries
- Trip form: pick one or more countries (searchable chips) instead of a single country.
- Trip keeps one overall start and end date.
- Each place on the route belongs to a country and gets optional "arrived" / "left" dates (must fall inside the trip dates). Can be filled in later when editing.
- Globe, country pages, rankings and upcoming all count a trip for every country it includes. A country page shows only that country's places on the route map, plus a "also visited on this trip" line with links to the other countries.
- Existing trips are migrated automatically (their current country becomes their only country).

## 2. Avatar from device or camera
- Profile page: "Choose photo" button opens the device file picker (on phones this offers camera roll and camera). Shows a round preview, uploads to private storage, displays via the same secure links as trip photos. The link field goes away.

## 3. Follow device light/dark mode
- Full light palette added next to the dark one; switches automatically with the device setting (and live when it changes). Globe and route map colors switch too.

## 4. Realistic globe
- Replace the dotted globe with a satellite-style Earth: day satellite texture, terrain bump, soft atmosphere, starry/space-free transparent background.
- Visited countries get a translucent green overlay with a bright outline, planned ones amber; hover lifts and brightens the country. Auto-rotate, drag-to-spin, no zoom on scroll, top-half hero all stay.
- Note: this replaces the dotted context-con style from earlier.

## 5. More playful, youthful theme
- Swap fonts: a rounded, bouncy display font (e.g. "Bricolage Grotesque") with a friendly body font (e.g. "Nunito"); drop the serif.
- Rounder corners, chunkier pill buttons with a small press/bounce animation, sticker-like cards with slight tilt on hover, emoji flags more prominent, playful microcopy ("Crossed off!", "Where next?").
- Keep black/white base with green accents and amber for planned, but greens slightly brighter.

## 6. Consistent keyboard focus
- One focus style everywhere: a 2px green ring with offset and rounded shape, applied only for keyboard focus, on every link, button, input, select, checkbox, card link, nav item and the globe container. Remove mixed default/outline styles.

## Technical details
- Migration: new `trip_countries (trip_id, country_code, country_name, position)` with RLS via `can_see_trip` / trip owner; backfill from `trips.country_code`; add nullable `country_code`, `arrived_on`, `left_on` to `trip_stops`; mark `trips.country_code/country_name` deprecated (kept, set to first country for compatibility).
- Update `tripsQuery`, `stats.ts` (+ tests for multi-country counting and stop-date range rule), Globe statuses, country page filters.
- Avatars: new private `avatars` bucket under `<userId>/…`, `profiles.avatar_url` stores the path; signed URL helper reused. Input `accept="image/*"`.
- Theme: `:root` light tokens + `@media (prefers-color-scheme: dark)` dark tokens; `--globe-*`/`--map-line` hex tokens per mode; MapLibre picks light/dark OpenFreeMap style via `matchMedia` listener.
- Globe: `globeImageUrl` (NASA Blue Marble from three-globe CDN), `bumpImageUrl`, `polygonsData` instead of hex dots.
- Focus: global `:focus-visible` rule in styles.css using `--ring`; strip conflicting `focus-visible:ring-*` variants from shadcn components.
- Update AGENTS.md and memory (globe style, fonts, color rules).

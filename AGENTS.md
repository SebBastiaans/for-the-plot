<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Data is read/written from the browser with the generated client + React Query (`src/lib/data.ts`); every trip belongs to a group; RLS limits reads to that group's members (`is_group_member`/`can_see_trip`) and writes to owners. The selected group lives in `src/lib/group.tsx` and every trips/profiles query is keyed by it. Joining/creating groups goes through security-definer RPCs so invite codes are never listable. Why: no server functions needed for a small friends app.
- "Upcoming" vs "visited" is derived from `start_date` vs today (`src/lib/stats.ts`), never stored. Why: avoids stale status.
- Trip media lives in a private bucket under `<userId>/<tripId>/…` and is shown via signed URLs. Why: workspace blocks public buckets.
- Globe (react-globe.gl, atlas texture (land mask from countries.geojson + HYP hillshade) in `public/textures/globe-{light,dark}.webp` made from Natural Earth HYP_50M_SR_W, country caps transparent unless visited/planned) and route map (MapLibre + OpenFreeMap) are lazy-loaded behind ClientOnly; page wheel events are kept from the globe (fixed size); WebGL colors come from `--globe-*`/`--map-line` hex tokens in styles.css, re-read on `prefers-color-scheme` change. Why: browser-only libs and three.js cannot parse oklch.
- Country shapes are bundled in `public/data/countries.geojson` (ISO_A2 fixed for FR/NO); `src/lib/countries.ts` is generated from it.

- A trip's countries live in `trip_countries` (exposed as `trip.countries`); `trips.country_code/name` are deprecated. Stops carry optional `country_code`/`arrived_on`/`left_on`, validated by `stopDatesError`. Why: trips span several countries.
- Light/dark follows the device via `@media (prefers-color-scheme)` tokens; focus is one global `:focus-visible` rule (no per-component focus utilities). Why: consistent theming and keyboard focus.
- Avatars live in the private `avatars` bucket under `<userId>/…`; `profiles.avatar_url` stores the path, resolved with `useAvatarUrls`.

- Trips belong to their creator (`trips.group_id` deprecated). Tagged people are `trip_members` rows: an insert trigger sets status (pending, or accepted for the creator or someone joining themselves), and invitees answer through `respond_to_trip`. A group shows the trips that pass its rule (`trip_counts_for_group`, mirrored by `qualifiesForGroup`), read through `group_trip_ids`. The "me" scope shows your own trips. Only participants (`is_trip_participant`) can add media and notes. Why: trips are personal and groups are derived from them.
- Photo time/place (EXIF via exifr, read in the browser) auto-tags media to a stop/day (`src/lib/photos.ts`, `addMediaToTrip`); /import matches photos to trips by date and suggests new trips. Why: Instagram/Snapchat offer no API to read stories.
- Trip details render through the shared `TripSection` (`src/components/TripDetails.tsx`), used by the country page (filtered to that country, links to `/trips/$id`) and the trip page. The edit page is un-nested (`trips.$id_.edit.tsx`). Why: one detail view everywhere.

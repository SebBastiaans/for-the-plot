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
- Globe (react-globe.gl) and route map (MapLibre + OpenFreeMap) are lazy-loaded behind ClientOnly; page wheel events are kept from the globe (fixed size); WebGL colors come from `--globe-*`/`--map-line` hex tokens in styles.css. Why: browser-only libs and three.js cannot parse oklch.
- Country shapes are bundled in `public/data/countries.geojson` (ISO_A2 fixed for FR/NO); `src/lib/countries.ts` is generated from it.

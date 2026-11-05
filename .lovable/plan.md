# Friends Travel Globe

A shared site where you and your friends log in, add trips, and see every visited country lit up on a spinnable 3D globe.

## Look and feel
- Forest & Moss palette: deep forest green background (#1a3c2a / #2d5a3d), moss accents (#5a8a5c), pale sage highlights (#a0c49d) for visited countries.
- Expedition-journal feel: serif display headings (Fraunces) with a clean sans body (Manrope), subtle paper-grain texture, small coordinate-style labels.

## Pages
1. **Home (/)** - full-screen hero with an interactive globe you can grab, spin and zoom, styled after context-con.com's live globe: a minimal globe built from tiny dots, slow auto-rotation, soft glow, and glowing markers. Visited countries' dots light up in sage green; unvisited dots stay dim. Hover shows the country name and number of trips. Clicking a visited country opens its page. Below: stats (countries, trips, friends) and a list of recent trips.
2. **Country page (/countries/$code)** - everything about that country:
   - Trips list with dates and cities visited
   - Who went (friend avatars and names)
   - Photo gallery
   - Stories / notes per trip
   - Route of the trip drawn on a map, with stops in order
3. **Sign in / sign up (/auth)** - email and password.
4. **Add / edit trip (/trips/new, /trips/$id/edit)** - signed-in only: pick country, dates, add cities as ordered stops (route), tag friends who came along, upload photos, write the story.
5. **Profile (/profile)** - set display name and avatar.

All friends can see everything; only signed-in friends can add trips, and you can only edit or delete trips you created.

## Technical details
- Lovable Cloud for accounts, data and photo storage.
- Tables: `profiles` (display name, avatar), `trips` (country code, title, start/end date, story, created_by), `trip_stops` (trip, city name, lat/lng, order), `trip_members` (trip, profile), `trip_photos` (trip, storage path, caption). RLS: signed-in users read all; writers own their trips.
- Public storage bucket `trip-photos`.
- Globe: `react-globe.gl` (hex-dot polygon layer for the dotted look, atmosphere glow, auto-rotate that pauses on drag) with a world countries GeoJSON (ISO codes) bundled in the project; loaded client-only (lazy import behind ClientOnly) since it needs the browser.
- Route map on the country page: MapLibre with a free OpenFreeMap dark style; stops plotted and connected by a line. City coordinates entered via a free geocoding lookup (OpenStreetMap Nominatim) when adding a stop.
- Each page gets its own title and description for sharing.

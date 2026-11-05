# My trips list and a trip detail page

## What you get
- **My trips page:** a list of all your trips (your own plus ones you accepted), newest first. Each row shows the trip name, countries, dates, number of places and photos, and who came along. Filters at the top for "All", "Visited" and "Upcoming". Added to the menu as "Trips" (and the bottom bar on phones).
- **Trip detail page:** tapping a trip opens its own page with everything about that trip: all countries, dates, the route map with every place, people, the full photo and video gallery, notes and story. Here you can also add photos and notes, and edit or delete the trip if it's yours.
- **From a country:** on a country page, each trip gets an "Open trip" link (and the trip title is tappable), which goes to the same trip detail page. A "Back" link returns you to where you came from.
- Clear loading, error and "no trips yet" messages, like the other pages.

## Technical details
- New routes: `src/routes/_authenticated/trips.index.tsx` (`/trips`) and `src/routes/_authenticated/trips.$id.tsx` (`/trips/$id`). Edit page becomes `trips.$id_.edit.tsx`-safe: since `trips.$id.edit.tsx` would nest under `trips.$id.tsx`, rename it to `trips_.$id.edit.tsx` style un-nesting (keep URL `/trips/$id/edit`).
- Move `TripSection`, `AddMedia`, `AddNote`, `DeleteMedia`, `PlaceTimeFields` out of the country route into `src/components/TripDetails.tsx` with an optional `code` filter (country page shows that country's stops; detail page shows all).
- Detail page reads from `tripsQuery(ME)`, falling back to the current group scope so friends' trips seen via a group also open; "not found" state if neither has it.
- Nav: add `/trips` link; head() metadata on both new routes.

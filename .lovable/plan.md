# Open a group to see its trips

## What you'll get
- On the Groups page, each group's name becomes tappable, and there's a "See trips" button.
- Tapping it opens a new page for that group showing:
  - the group name, how many members it has and its rule (for example "everyone" or "at least 60%")
  - a list of every trip that counts for the group, newest first, with All / Visited / Upcoming filters. It looks just like the My trips list: countries, dates, number of places, photos and who came along.
- Tapping a trip opens its usual trip page.
- If no trips count yet, the page explains why: not enough members came along on any trip to meet the rule.
- A "Back to groups" link, plus loading and error messages.

## Technical details
- New route `src/routes/_authenticated/groups.$id.tsx` (`/groups/$id`). It reads the group from `useGroup().groups` and the trips from `tripsQuery(id)`, using `useProfilesMap(id)` for people. It shows a not-found state if you aren't a member.
- Move the trip row markup out of `trips.index.tsx` into a shared `TripRow` component, so both lists look the same.
- In `groups.tsx`, wrap the GroupCard title in a `Link` and add a "See trips" button.
- Give the new page its own head() title and description.

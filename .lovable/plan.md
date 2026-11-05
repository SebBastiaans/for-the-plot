# Personal trips, tagged friends, and group rules

## How it will work
1. **Trips belong to you.** "Add a trip" saves it to your own account. You no longer pick a group.
2. **Tag who came along.** You pick friends from anyone who shares a group with you. Each person you tag gets an invite.
3. **Accept or decline.** A new **Inbox** tab, with a counter on the bell in the bottom bar, lists trip invites with Accept and Decline buttons. Declined people are taken off the trip. People still waiting show as "pending" on the trip.
4. **Groups fill themselves.** A group shows every trip where enough of its members took part. Only people who accepted count, and the trip creator always counts.
5. **Group rule (set by the group owner on the Groups page):**
   - Everyone in the group (default)
   - At least N people (for example 8 of 10)
   - At least X% of the group (for example 60%)
   The globe, rankings, upcoming and country pages for a group use only the trips that meet the rule. If people join or leave the group, the list updates on its own.
6. **My trips.** A personal view (switcher option "Just me") shows all your own trips and accepted trips on the globe, even when they don't count for any group.
7. **Editing.** Only the creator can edit or delete a trip. Tagged people can leave a trip they accepted. Photos and notes can be added by anyone who can see the trip.

## Existing data
Current trips stay with their creator. Everyone already listed on them is marked as accepted, so groups keep showing what they show today (as long as the group rule is met).

## Technical details
- Migration: `trip_members.status` ('pending'|'accepted'|'declined', default 'pending', backfill 'accepted'), `invited_at`. `groups.rule_type` ('all'|'count'|'percent', default 'all') and `rule_value` int. `trips.group_id` stops being used and is marked deprecated.
- SQL function `trip_counts_for_group(trip, group)`: counts accepted members plus the creator who are in `group_members`, then compares the total to the rule. `group_trip_ids(group)` RPC is security definer and only works for group members.
- RLS on trips and children (`can_see_trip`): you can see a trip if you created it, are tagged on it, or are in a group the trip counts for. Inserts no longer need a group. Tagged users may update only their own `status`, using a security-definer `respond_to_trip(trip, accept)` RPC.
- Tag picker: profiles of anyone who shares a group with you (`shares_group_with` helper).
- Frontend: `tripsQuery(scope)`, where scope is a group id or "me". The group switcher gets a "Just me" option. New `/inbox` route and a nav badge (query of pending invites, refreshed every 60s and on focus). Rule editor on the Groups page. Pending and declined badges on the trip page.
- Tests: a rule check helper (`qualifiesForGroup`) with unit tests for 'all', 8 of 10, and 60% cases. It mirrors the SQL logic.
- Notifications are in-app only for now. Email can be added later.

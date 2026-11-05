# Route dates, steadier map pins, camera-roll photos and auto-sorting

## 1. Pre-filled arrival day
When you add a new place to the route, its arrival day is filled in automatically with the day the previous place ended (or the trip's start day for the first place). You can still tap another day or clear it.

## 2. Map pins drifting away
Cause: making a pin bigger on hover replaces the positioning the map uses to place the pin, so it jumps away from its spot. Fix: put the number inside the pin and only grow that inner part, so the pin itself never moves.

## 3. Photos and videos from your camera roll
- A clear "Add from camera roll" button on each trip (country page) that opens the phone's photo library, with multiple selection for photos and videos.
- The same button in the trip form, so you can pick photos while creating or editing a trip; they upload once the trip is saved.
- Shows small previews and upload progress before saving.

## 4. Automatic sorting (instead of Snapchat/Instagram sync)
Snapchat and Instagram don't let other apps read your stories, so a direct sync isn't possible. What we can do with the photos' own info (time and location stored in each photo):
- **Auto-tag:** when you add photos to a trip, each one is linked to the right place and day of the route based on when and where it was taken.
- **Bulk import:** a new "Import photos" page. Pick many photos at once; they're matched to your existing trips by date. Photos that don't fit any trip are grouped by date and country into suggested new trips, which you can create with one tap (and then edit).
- Videos and photos without location or time info stay unsorted and can be tagged by hand. Tip: Instagram and Snapchat save your own stories to your camera roll if you turn that on in their settings, so those can be imported too.

## 5. Globe keeps spinning on hover
Pointing at a country still highlights it and shows its name, but the globe keeps turning.

## Technical details
- Globe: remove the auto-rotate pause on polygon hover.
- StopDays/TripForm: on adding a stop, set `arrived_on` = previous stop's `left_on` ?? trip start (only when within trip range).
- PlacePickerMap: marker element = wrapper div; apply scale to an inner span; drop `transition-transform` on the wrapper.
- Read EXIF (DateTimeOriginal, GPS) in the browser with `exifr`; match to trip by date range, then to nearest stop by distance/date; store `stop_id`/`taken_at` on `trip_media` (columns already used for tagging).
- Suggested trips: cluster unmatched photos by consecutive days + reverse-geocoded country; creating one inserts trip + countries + media through the existing save flow.
- Upload stays in the private bucket under `<userId>/<tripId>/…`.

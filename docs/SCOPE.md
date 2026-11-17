# BirdGo: first version (prototype) scope

**Status:** draft for review.

## The plan

1. **Pin down the first version and its look.** This document, plus the style board.
2. **Bird data and spawn rules.** Real species ranges and seasonal sightings (eBird, GBIF) plus live weather (Open-Meteo) decide which birds appear.
3. **Playable prototype.** A phone-browser web app: map, birds spawning, catch, collection.
4. **Playtest and expand.** Tune rarity, add art and sound, then bigger features.

## In the first version

- **Live map.** Shows your real location and birds appearing nearby. Uses the phone's location with your permission.
- **Spawns driven by real factors.**
  - *Region:* only species that actually occur in your area.
  - *Season:* migrants come and go at the right time of year.
  - *Time of day:* for example owls at night, songbirds in the morning.
  - *Weather:* current conditions shift the odds (rain, cold, wind, clear).
  - *Habitat (simple):* water birds near water, where map data allows.
- **Catch.** Tap a nearby bird to open an encounter and try to catch it with one simple, fun interaction.
- **Collection ("field guide").** Every species you've caught, with its name, a picture, a short fact, and where and when you caught it. Shows how many of your area's species you've found.
- **Saved on your phone.** Progress is stored in the browser. No account or login yet.
- **Rarity.** Common, uncommon and rare birds, based on how often they're really seen.

## Later (not in the first version)

- Accounts, cloud saving and multiple devices
- Friends, trading, leaderboards
- Items, levels, quests, events
- Real bird photos or sound recognition
- Installable app store version (iPhone/Android)
- RBZ's hand-drawn art for every species (the prototype uses simple placeholder avatars, built to be swapped out)

## Look and feel

Decided together, round by round. Round 1 offers three directions: **A Field Journal**, **B Daybreak**, **C Night Radar** (see the [style board](design/style-board-round1.html)).

**Chosen direction:** **A, Field Journal** (chosen 2026-11-17). Inked trail map on notebook paper, handwritten labels, catching feels like logging a sighting in a journal.

**Bird art:** simple placeholder avatars for now. Later, RBZ will upload hand-drawn bird designs, so the app keeps each species' picture as a separate swappable image file (one per species) rather than baking art into the code.

## Open questions

- Should catching be skill-based (timing tap), luck-based, or something calmer like "observe for a few seconds"?
- Testing: will you play it near home first? (Affects which region's birds we tune first.)

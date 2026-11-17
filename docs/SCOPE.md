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

## Catching (decided 2026-11-17)

**Seed Toss.** Swipe a linen seed pouch (purple "S" on it) at the bird. A shrinking ink ring sets the odds; the pouch wobbles up to three times, then the bird is logged or slips out. Rarer birds hop more, slip out more and can fly away. Callouts: "Tuffington!" (small ring) or "Tuff!" on a hit, "Oy vey!" or "Shucks!" on a miss. Prototype: [Catch Lab](design/catch-lab.html).

## Spawn rules (built 2026-11-17)

`src/spawn.js` weights each bird by monthly abundance, rarity, habitat match, time of day (dawn chorus boost, sleeping birds at night), species weather likes/dislikes, and general weather rules (rain quiets songbirds, storms push seabirds to shore). Live weather comes from Open-Meteo via `src/weather.js`. Try it in the [Spawn Explorer](design/spawn-explorer.html).

## GPS plan

Browser Geolocation (`watchPosition`) while the app is open; host on GitHub Pages (https is required for location). OpenStreetMap data for the map (restyled to the Field Journal look) and for nearby habitat (water, woods, fields, town).

## Notebook ideas (from RBZ, 2026-11-17)

RBZ's notebook page of ideas, in the order we plan to build them. Each one feeds the next.

1. **Birdseed in the wild.** Seed stashes sit at fixed spots on the map. Walk to one to fill your seed bag; it refills after a while. Every Seed Toss uses a pouch from your bag (still at most 10 / 6 / 3 per common / uncommon / rare encounter). Later: bigger stashes at tree houses.
2. **Bird info pages.** A page per species in the journal: more species-specific attributes, real info and fun facts, a real photo, and links out (All About Birds, eBird, Wikipedia). Photos: eBird / Macaulay Library media can't be copied into the game without permission, so use freely licensed (Creative Commons) photos from Wikimedia Commons with credit, and link to eBird rather than copying from it.
3. **Habitats (tree houses?).** Where your caught birds live. Birds have to be fed with birdseed you collect. Habitat shows the better info pages. What habitats look like is to be designed together.
4. **Bird XP.** Earned by catching new or rare species, feeding birds in your habitat, and (if we add it) mating.
5. **Growing up (evolution).** Infant, adolescent, adult, driven by feeding and XP.
6. **Seed pouch skins.** New pouch designs, unlocked through grown-up birds and bird XP. RBZ has skin ideas to share.
7. **Sketches for birds.** RBZ's hand-drawn art replaces placeholders (one image per species).

**Open questions (later):**
- Can adult birds mate and produce offspring? How would that work in the habitat?
- Bird arenas: what would birds do there (song contests, displays)? Tree houses as arenas?
- Birdseed stashes at tree houses?

## Open questions

- Testing starts around Brunswick, Maine (answered).

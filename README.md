# BirdGo

A location-based bird-collecting game. Walk around, find birds that live where you are, and catch them for your collection. Which birds show up depends on your region, the season and the live weather.

The first version is a web app you open in your phone's browser (iPhone or Android, no app store).

- [First-version scope](docs/SCOPE.md): what the prototype includes and what waits until later
- [Style board, round 1](docs/design/style-board-round1.html): three visual directions (chose A, Field Journal)
- [Catch Lab](docs/design/catch-lab.html): playable Seed Toss, the chosen catching mechanic
- [Brunswick bird list](data/birds-brunswick-me.json): 55 starter species with season, habitat, time of day and rarity
- [Spawn Explorer](docs/design/spawn-explorer.html): see which birds spawn under any conditions

## Code

- `src/spawn.js`: spawn rules (season, time of day, weather, habitat, rarity)
- `src/weather.js`: live weather for the player's location (Open-Meteo, no key needed)
- `npm test`: runs the spawn-rule tests
- `npm run build:explorer`: rebuilds the Spawn Explorer page from the real rules and bird list

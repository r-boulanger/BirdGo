// BirdGo spawn rules: decide which birds show up for a given set of conditions.
// Pure functions, no browser APIs, so they run the same in the app and in tests.
//
// conditions = {
//   month: 1-12,
//   timeOfDay: "dawn" | "day" | "dusk" | "night",
//   weather: "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm",
//   cold: boolean,      // below freezing
//   windy: boolean,     // strong wind
//   habitats: ["town","forest","field","marsh","freshwater","coast"]  // what's around the player
// }

const ABUNDANCE = [0, 1, 3, 6];                    // bird.months value 0-3 -> base weight
const RARITY = { common: 1, uncommon: 0.45, rare: 0.12 };
const SMALL_LAND_BIRDS = ["songbird", "warbler", "woodpecker"];

export function birdWeight(bird, c) {
  const a = bird.months[c.month - 1];
  if (!a) return 0;                                // not here this time of year
  let w = ABUNDANCE[a] * (RARITY[bird.rarity] ?? 1);

  // Habitat: birds near their habitat are much more likely.
  if (c.habitats && c.habitats.length) {
    w *= bird.habitats.some(h => c.habitats.includes(h)) ? 1.6 : 0.2;
  }

  // Time of day: off-hours birds are mostly asleep.
  const tod = c.timeOfDay;
  if (bird.active.includes(tod)) {
    if (tod === "dawn" && SMALL_LAND_BIRDS.includes(bird.group)) w *= 1.4;   // dawn chorus
  } else {
    w *= tod === "night" ? 0.03 : 0.35;
  }

  // Weather: species preferences first...
  const tags = [c.weather];
  if (c.cold) tags.push("cold");
  if (c.windy) tags.push("wind");
  for (const t of tags) {
    if (bird.likes.includes(t)) w *= 1.8;
    if (bird.dislikes.includes(t)) w *= 0.35;
  }
  // ...then general rules by bird type.
  const g = bird.group;
  if (c.weather === "rain" && SMALL_LAND_BIRDS.includes(g)) w *= 0.6;
  if (c.weather === "storm") w *= SMALL_LAND_BIRDS.includes(g) ? 0.3 : g === "seabird" ? 1.4 : 0.8;
  if (c.weather === "snow" && g === "warbler") w *= 0.2;
  if (c.weather === "fog" && g === "raptor") w *= 0.6;
  if (c.windy && SMALL_LAND_BIRDS.includes(g)) w *= 0.7;

  return w;
}

// Every bird with its chance of being the next spawn, most likely first.
export function spawnTable(birds, c) {
  const rows = birds.map(bird => ({ bird, weight: birdWeight(bird, c) })).filter(r => r.weight > 0);
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  for (const r of rows) r.chance = r.weight / total;
  return rows.sort((a, b) => b.weight - a.weight);
}

// Pick n different birds to place on the map, weighted by chance.
export function pickSpawns(birds, c, n = 5, rng = Math.random) {
  const pool = spawnTable(birds, c);
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, r) => s + r.weight, 0);
    let x = rng() * total, i = 0;
    while (i < pool.length - 1 && (x -= pool[i].weight) > 0) i++;
    out.push(pool.splice(i, 1)[0].bird);
  }
  return out;
}

// Turn an hour (0-24, may be fractional) and today's sunrise/sunset hours into a time-of-day bucket.
export function timeOfDay(hour, sunrise, sunset) {
  if (hour >= sunrise - 0.75 && hour < sunrise + 1.5) return "dawn";
  if (hour >= sunset - 1.25 && hour < sunset + 0.75) return "dusk";
  if (hour >= sunrise + 1.5 && hour < sunset - 1.25) return "day";
  return "night";
}

// WMO weather codes (used by Open-Meteo) -> BirdGo weather.
export function weatherFromCode(code) {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

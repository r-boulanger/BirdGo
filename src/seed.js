// Birdseed in the wild: seed stashes at fixed spots on the map, and the player's seed bag.
// Stashes come from a grid laid over the world, one per cell, so each stash stays in the
// same real place every time you walk past it.
const KEY = "birdgo.seed.v1";
export const SEED = {
  startBag: 20,          // pouches a new player starts with
  maxBag: 20,            // your backpack holds at most this many (the rest lives at your tree house)
  cellM: 220,            // grid size: roughly one stash per 220 m square
  refillMs: 15 * 60 * 1000, // an emptied stash refills after 15 minutes
  rangeM: 40,            // how close you must be to collect
};

// Small deterministic hash so a cell always puts its stash in the same spot.
function hash(a, b, salt = 0) {
  let h = (a * 374761393 + b * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const latStep = SEED.cellM / 111320;
const lonStep = lat => SEED.cellM / (111320 * Math.cos(lat * Math.PI / 180));

// All stashes within `radiusM` (roughly) of a point. Lon step is fixed per latitude band
// so cells don't shift as you walk north or south.
export function stashesNear(lat, lon, radiusM = 350) {
  const band = Math.round(lat);              // 1° bands: cells stay put while you walk
  const ls = lonStep(band);
  const cy = Math.floor(lat / latStep), cx = Math.floor(lon / ls);
  const n = Math.ceil(radiusM / SEED.cellM);
  const out = [];
  for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
    const y = cy + dy, x = cx + dx;
    const at = [(y + .15 + .7 * hash(x, y, 1)) * latStep, (x + .15 + .7 * hash(x, y, 2)) * ls];
    out.push({ id: `${band}:${x}:${y}`, at, amount: 3 + Math.floor(hash(x, y, 3) * 5) }); // 3–7 pouches
  }
  return out;
}

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s.bag === "number") return { bag: s.bag, used: s.used || {} };
  } catch { /* storage blocked */ }
  return { bag: SEED.startBag, used: {} };
}
export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked: lasts this visit */ }
}

export const isReady = (s, stash, now = Date.now()) => !s.used[stash.id] || now - s.used[stash.id] >= SEED.refillMs;
export const readyIn = (s, stash, now = Date.now()) => Math.max(0, SEED.refillMs - (now - (s.used[stash.id] || 0)));

// Collect a stash. Returns how many pouches went into the bag (0 if empty or bag full).
export function collect(s, stash, now = Date.now()) {
  if (!isReady(s, stash, now)) return 0;
  const got = Math.min(stash.amount, SEED.maxBag - s.bag);
  if (got <= 0) return 0;
  s.bag += got; s.used[stash.id] = now;
  // Forget stashes that refilled long ago so storage stays small.
  for (const [id, t] of Object.entries(s.used)) if (now - t > SEED.refillMs * 4) delete s.used[id];
  save(s);
  return got;
}
export function spend(s, n = 1) { s.bag = Math.max(0, s.bag - n); save(s); return s.bag; }

// Tree houses (from RBZ's notebook):
// - You place your tree house on the map (first time free); moving it costs seed.
// - Your caught birds live there. They can be fed there, and can only evolve there.
// - Your seed is stashed there. You only carry a limited backpack on a trip, and
//   refill it when you revisit the tree house.
const KEY = "birdgo.treehouse.v1";
export const TH = {
  backpackMax: 20,     // pouches you can carry on a trip
  moveCost: 15,        // pouches (from your backpack) to move the tree house
  rangeM: 50,          // how close counts as "at your tree house"
  heartsMax: 3,        // each bird's fullness
  heartMs: 8 * 3600e3, // one heart empties every 8 hours
};

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s.stash === "number") return s;
  } catch { /* storage blocked */ }
  return { at: null, stash: 0, fed: {} };   // fed[birdId] = { hearts, t }
}
export function save(h) { try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* ignore */ } }

// ---------- placing ----------
// Returns { ok, cost } or { ok:false, why }. `seed` is the backpack ({ bag }).
export function place(h, seed, at) {
  const cost = h.at ? TH.moveCost : 0;
  if (seed.bag < cost) return { ok: false, why: `Moving your tree house costs ${cost} seed pouches. You have ${seed.bag} in your backpack.` };
  seed.bag -= cost; h.at = at;
  return { ok: true, cost };
}

// When the tree house is first built, anything over the backpack limit goes into the stash.
export function settleBackpack(h, seed) {
  if (seed.bag > TH.backpackMax) { h.stash += seed.bag - TH.backpackMax; seed.bag = TH.backpackMax; }
}

// ---------- seed between backpack and stash ----------
export function fillBackpack(h, seed) {
  const n = Math.min(h.stash, TH.backpackMax - seed.bag);
  if (n > 0) { h.stash -= n; seed.bag += n; }
  return Math.max(0, n);
}
export function storeExtra(h, seed, keep = 0) {
  const n = Math.max(0, seed.bag - keep);
  h.stash += n; seed.bag -= n;
  return n;
}
export function spendStash(h, n) {
  if (h.stash < n) return false;
  h.stash -= n; return true;
}

// ---------- feeding ----------
export function hearts(h, id, now = Date.now()) {
  const f = h.fed[id];
  if (!f) return 0;
  return Math.max(0, f.hearts - Math.floor((now - f.t) / TH.heartMs));
}
// Feeding uses 1 pouch from the stash and fills 1 heart. Returns new hearts, or null.
export function feed(h, id, now = Date.now()) {
  const cur = hearts(h, id, now);
  if (cur >= TH.heartsMax || h.stash < 1) return null;
  h.stash -= 1;
  h.fed[id] = { hearts: cur + 1, t: now };
  return cur + 1;
}
export const isHappy = (h, id, now = Date.now()) => hearts(h, id, now) >= TH.heartsMax;

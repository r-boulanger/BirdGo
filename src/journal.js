// The player's field journal, saved on this phone (browser storage).
const KEY = "birdgo.journal.v1";

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function save(j) {
  try { localStorage.setItem(KEY, JSON.stringify(j)); } catch { /* storage blocked: journal lasts this visit only */ }
}
export function log(j, bird, details) {
  const e = j[bird.id] || { first: details, count: 0 };
  e.count++; e.last = details;
  j[bird.id] = e; save(j);
  return e;
}

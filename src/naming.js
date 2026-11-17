// Naming your birds: give a species in your journal a nickname for seed pouches.
export const NAME_COST = 5;      // pouches per naming (renaming costs the same)
export const NAME_MAX = 16;      // letters

// Tidy what the player typed: no extra spaces, no control characters, not too long.
export function cleanName(s) {
  return String(s ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX).trim();
}

// Why naming isn't possible right now, or "" if it is.
export function nameProblem(e, name, bag) {
  const n = cleanName(name);
  if (!e) return "Catch this bird first.";
  if (!n) return "Type a name first.";
  if (n === e.nickname) return "That's already its name.";
  if (bag < NAME_COST) return `Naming costs ${NAME_COST} seed pouches. You have ${bag}.`;
  return "";
}

// Applies the name. Returns { name, cost } or null.
export function setName(e, name, bag) {
  if (nameProblem(e, name, bag)) return null;
  e.nickname = cleanName(name);
  return { name: e.nickname, cost: NAME_COST };
}

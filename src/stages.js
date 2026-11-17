// Growing up: infant -> adolescent -> adult, per species in your journal.
// Placeholder art for each stage is drawn from the bird's colors, so RBZ's
// hand-drawn art can replace it later (one image per species per stage).
export const STAGES = ["infant", "adolescent", "adult"];
export const STAGE_LABEL = { infant: "Infant", adolescent: "Adolescent", adult: "Adult" };
// Growth points needed to reach the next stage.
export const GROW = { infant: 10, adolescent: 25 };
export const POINTS = { catch: 4, feed: 2 };

// ---------- growth rules ----------
export function stageOf(e) { return e?.stage || "infant"; }
export function nextStage(s) { return STAGES[STAGES.indexOf(s) + 1] || null; }
export function needed(e) { return GROW[stageOf(e)] ?? null; }

// Add growth points; returns the new stage if the bird grew up, else null.
export function addGrowth(e, pts) {
  if (!e.stage) e.stage = "infant";
  if (e.stage === "adult") return null;
  e.growth = (e.growth || 0) + pts;
  const need = GROW[e.stage];
  if (e.growth >= need) {
    e.growth = 0; e.stage = nextStage(e.stage);
    return e.stage;
  }
  return null;
}

// ---------- art ----------
function rgb(c) {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const [r, g, b, a = 1] = m[1].split(",").map(Number); return [r, g, b, a]; }
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
}
export function mix(c, t, k) {
  const a = rgb(c), b = rgb(t);
  if (a[3] < 1) return c;
  return "#" + [0, 1, 2].map(i => Math.round(a[i] * (1 - k) + b[i] * k).toString(16).padStart(2, "0")).join("");
}

function adult(c) {
  return `<path d="M10 40 L2 50 L16 46 Z" fill="${c.tail}"/><ellipse cx="30" cy="38" rx="20" ry="13" fill="${c.body}"/><circle cx="44" cy="24" r="10" fill="${c.head}"/><path d="M40 15 L46 4 L50 16 Z" fill="${c.head}"/><path d="M53 22 L62 26 L53 29 Z" fill="${c.beak}"/><circle cx="47" cy="22" r="2" fill="#111"/><path d="M18 34 Q30 26 40 38 Q30 44 18 34 Z" fill="${c.wing}"/><path d="M26 50 L24 58 M34 50 L36 58" stroke="#555" stroke-width="2"/>`;
}
function adolescent(c) {
  const d = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, mix(v, "#9C9282", .45)]));
  return `<g transform="translate(4 4) scale(.88)"><path d="M12 40 L6 48 L17 45 Z" fill="${d.tail}"/><ellipse cx="30" cy="38" rx="18" ry="13" fill="${d.body}"/><circle cx="43" cy="25" r="10.5" fill="${d.head}"/><path d="M40 16 L43 9 L46 13 L48 16 Z" fill="${d.head}"/><path d="M52 23 L59 26 L52 28.5 Z" fill="${d.beak}"/><circle cx="46.5" cy="23" r="2.3" fill="#111"/><circle cx="47.2" cy="22.3" r=".7" fill="#fff"/><path d="M19 34 Q30 27 39 38 Q30 43 19 34 Z" fill="${d.wing}"/><path d="M22 47 l-2 3 M30 50 l0 3 M38 47 l2 3" stroke="${d.body}" stroke-width="2" stroke-linecap="round"/><path d="M27 50 L25 58 M34 50 L36 58" stroke="#555" stroke-width="2"/></g>`;
}
function infant(c) {
  const body = mix(c.body, "#EDE6D6", .55), head = mix(c.head, "#EDE6D6", .4), beak = mix(c.beak, "#F2C46B", .5);
  return `<ellipse cx="32" cy="58" rx="13" ry="2.5" fill="rgba(37,51,44,.15)"/><path d="M27 52 L26 58 M37 52 L38 58" stroke="#E0A54A" stroke-width="2.2" stroke-linecap="round"/><circle cx="32" cy="40" r="15" fill="${body}"/><circle cx="34" cy="26" r="11" fill="${head}"/><path d="M30 15 q2 -6 4 0 M34 15 q3 -5 5 1 M27 17 q0 -5 3 -1" fill="none" stroke="${head}" stroke-width="2" stroke-linecap="round"/><path d="M19 38 q-4 4 -1 9 q4 -1 6 -5" fill="${mix(body, "#25332C", .12)}"/><path d="M43 26 L50 28 L43 30.5 Z" fill="${beak}"/><circle cx="38" cy="24.5" r="3.4" fill="#111"/><circle cx="39.2" cy="23.3" r="1.1" fill="#fff"/><path d="M22 47 q2 3 0 5 M42 47 q-2 3 0 5 M32 53 v3" stroke="${body}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
}
const DRAW = { infant, adolescent, adult };
export function stageSVG(bird, stage = "adult", attrs = "") {
  return `<svg viewBox="0 0 64 64" ${attrs} aria-hidden="true">${DRAW[stage](bird.colors)}</svg>`;
}

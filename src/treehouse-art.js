// Tree house art (look B, "Cubby cutaway", picked by RBZ): an inked tree house in a
// leafy tree, front wall cut away to show six cubbies. Birds sit on straw nests;
// named birds get their stitched name plate over the cubby.
import { stageSVG } from "./stages.js";
const escT = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const CUBBIES = 6;

// deterministic wobble so hand-inked lines aren't ruler-straight
let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const W = 360, H = 330, INK = "#25332C";

// ---- leaves: clusters of inked leaf blobs ----
function leafCluster(cx, cy, rx, ry, n, shades) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, rr = 9 + r() * 9, rot = r() * 180;
    s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr * .62).toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${shades[i % shades.length]}" stroke="${INK}" stroke-width=".9"/>`;
    if (r() < .5) s += `<path d="M${(x - rr * .6).toFixed(1)} ${y.toFixed(1)} L${(x + rr * .6).toFixed(1)} ${y.toFixed(1)}" transform="rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" stroke="${INK}" stroke-width=".5" opacity=".5"/>`;
  }
  return s;
}
// ---- distant pines ----
function pines(y0, n, color, h) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = i * (W / (n - 1)) + (r() - .5) * 12, hh = h * (.7 + r() * .5);
    s += `<path d="M${x} ${y0 - hh} L${x - hh * .28} ${y0} L${x + hh * .28} ${y0} Z" fill="${color}"/>`;
  }
  return s;
}
// ---- planks on a wall ----
function planks(x, y, w, h, dir = "h", color = "#C08A52") {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  if (dir === "h") for (let yy = y + 9; yy < y + h; yy += 9) s += `<path d="M${x} ${yy} H${x + w}" stroke="${INK}" stroke-width=".7" opacity=".45"/>`;
  else for (let xx = x + 11; xx < x + w; xx += 11) s += `<path d="M${xx} ${y} V${y + h}" stroke="${INK}" stroke-width=".7" opacity=".45"/>`;
  for (let i = 0; i < w * h / 900; i++) { const kx = x + r() * w, ky = y + r() * h; s += `<ellipse cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" rx="2.2" ry="1.2" fill="none" stroke="${INK}" stroke-width=".6" opacity=".45"/>`; }
  return s;
}
// ---- shingles ----
function shingles(x0, x1, y0, y1, apexX) {
  let s = "";
  for (let y = y1 - 9, row = 0; y > y0 + 4; y -= 8, row++) {
    const t = (y - y0) / (y1 - y0), half = (apexX - x0) * t, L = apexX - half, R = apexX + half;
    for (let x = L + (row % 2 ? 6 : 0); x < R - 4; x += 12) s += `<path d="M${x.toFixed(1)} ${y} q6 9 12 0" fill="none" stroke="${INK}" stroke-width=".8" opacity=".55"/>`;
  }
  return s;
}
// ---- straw nest ----
function nest(cx, cy, w) {
  let s = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="7" fill="#C9A45C" stroke="${INK}" stroke-width="1"/>`;
  for (let i = 0; i < 14; i++) { const x = cx - w / 2 + r() * w, y = cy - 4 + r() * 8; s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(4 + r() * 6).toFixed(1)} ${(-3 + r() * 6).toFixed(1)} ${(9 + r() * 8).toFixed(1)} ${(-2 + r() * 4).toFixed(1)}" fill="none" stroke="${i % 3 ? "#8C6A2E" : "#E8D49A"}" stroke-width="1"/>`; }
  return s;
}

// layout
const HX = 52, HY = 92, HW = 256, HH = 170;      // house body
const CW = 74, CH = 72, GX = 10, GY = 10, CX0 = HX + 14, CY0 = HY + 12;
const cell = (i) => [CX0 + (i % 3) * (CW + GX), CY0 + Math.floor(i / 3) * (CH + GY)];

function scene(slots, sign = "boards", name = "Birdhouse Inn") {
  let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD3DC"/><stop offset="1" stop-color="#E6ECE4"/></linearGradient>
    <linearGradient id="bark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6B4826"/><stop offset=".45" stop-color="#9A6B3E"/><stop offset="1" stop-color="#5E3F20"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(37,51,44,.35)"/><stop offset="1" stop-color="rgba(37,51,44,0)"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="300" cy="40" r="20" fill="#F3E7B8" opacity=".9"/>
  <path d="M0 250 Q90 238 180 246 T360 242 V${H} H0Z" fill="#9FB49A"/>
  ${pines(252, 16, "#8FA79A", 46)}${pines(262, 12, "#6F8C7C", 40)}
  <path d="M0 268 Q120 256 360 266 V${H} H0Z" fill="#A9BE8E"/>`;
  // trunk & branches behind house
  s += `<path d="M162 ${H} C166 280 158 230 160 60 L200 60 C200 230 196 280 204 ${H} Z" fill="url(#bark)" stroke="${INK}" stroke-width="2"/>`;
  for (let i = 0; i < 9; i++) { const x = 166 + r() * 30, y = 268 + r() * 50; s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(r() * 4 - 2).toFixed(1)} 8 ${(r() * 2 - 1).toFixed(1)} 16" fill="none" stroke="${INK}" stroke-width=".9" opacity=".6"/>`; }
  s += `<path d="M160 ${H} q-24 -2 -34 4 M204 ${H} q22 -3 34 3" stroke="${INK}" stroke-width="2" fill="none"/>`; // roots
  s += `<path d="M170 70 C130 40 80 36 30 44 M190 70 C232 36 290 30 346 40 M180 66 C182 40 186 22 196 4" stroke="#7A5530" stroke-width="9" stroke-linecap="round" fill="none"/>
        <path d="M170 70 C130 40 80 36 30 44 M190 70 C232 36 290 30 346 40 M180 66 C182 40 186 22 196 4" stroke="${INK}" stroke-width="1.2" fill="none" opacity=".6"/>`;
  s += leafCluster(60, 34, 70, 26, 34, ["#6E8B55", "#7FA167", "#5D7A47"]);
  s += leafCluster(300, 30, 72, 26, 34, ["#6E8B55", "#7FA167", "#5D7A47"]);
  s += leafCluster(190, 10, 60, 18, 22, ["#7FA167", "#6E8B55"]);
  // more branches and leaves behind the house, poking out both sides
  s += `<path d="M168 190 C120 170 60 168 4 150 M196 170 C240 150 300 148 358 128 M170 240 C120 232 70 236 10 222 M194 226 C250 214 300 220 358 206 M176 120 C130 100 80 96 20 100 M188 116 C240 96 290 94 350 86" stroke="#7A5530" stroke-width="7" stroke-linecap="round" fill="none"/>
        <path d="M168 190 C120 170 60 168 4 150 M196 170 C240 150 300 148 358 128 M170 240 C120 232 70 236 10 222 M194 226 C250 214 300 220 358 206 M176 120 C130 100 80 96 20 100 M188 116 C240 96 290 94 350 86" stroke="${INK}" stroke-width="1" fill="none" opacity=".55"/>
        <path d="M60 168 q-10 -14 -26 -16 M300 148 q8 -14 24 -18 M80 98 q-6 -12 -20 -16 M290 94 q10 -10 26 -10" stroke="#7A5530" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  s += leafCluster(22, 140, 30, 60, 30, ["#5D7A47", "#6E8B55", "#4E6B3C"]);
  s += leafCluster(340, 128, 30, 64, 30, ["#5D7A47", "#6E8B55", "#4E6B3C"]);
  s += leafCluster(24, 222, 26, 22, 14, ["#6E8B55", "#5D7A47"]);
  s += leafCluster(342, 206, 24, 22, 14, ["#6E8B55", "#5D7A47"]);
  s += leafCluster(180, 70, 150, 28, 40, ["#5D7A47", "#6E8B55", "#7FA167", "#4E6B3C"]);
  // platform + braces
  s += `<path d="M84 ${HY + HH + 10} L160 ${HY + HH + 54} M276 ${HY + HH + 10} L204 ${HY + HH + 54}" stroke="#6B4826" stroke-width="7"/>
        <path d="M84 ${HY + HH + 10} L160 ${HY + HH + 54} M276 ${HY + HH + 10} L204 ${HY + HH + 54}" stroke="${INK}" stroke-width="1" opacity=".6"/>`;
  s += planks(26, HY + HH, 330, 12, "v", "#A8743F") + `<rect x="26" y="${HY + HH}" width="330" height="12" fill="none" stroke="${INK}" stroke-width="2"/>`;
  // railing posts on platform ends
  s += `<path d="M30 ${HY + HH} V${HY + HH - 26} M48 ${HY + HH} V${HY + HH - 26} M352 ${HY + HH} V${HY + HH - 26} M28 ${HY + HH - 24} H50" stroke="#6B4826" stroke-width="3.5"/>`;
  // ladder
  s += `<path d="M36 ${HY + HH + 12} L28 ${H} M52 ${HY + HH + 12} L46 ${H}" stroke="#6B4826" stroke-width="3"/>`;
  for (let y = HY + HH + 24; y < H; y += 13) s += `<path d="M${33 - (y - HY - HH) * .13} ${y} H${50 - (y - HY - HH) * .1}" stroke="#6B4826" stroke-width="2.5"/>`;
  // house back wall + outer frame
  s += planks(HX, HY, HW, HH, "h", "#B98149") + `<rect x="${HX}" y="${HY}" width="${HW}" height="${HH}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
  // cubbies
  for (let i = 0; i < 6; i++) {
    const [x, y] = cell(i);
    s += planks(x, y, CW, CH, "v", "#E2C590");
    s += `<rect x="${x}" y="${y}" width="${CW}" height="12" fill="url(#shade)"/><rect x="${x}" y="${y}" width="${CW}" height="${CH}" fill="none" stroke="${INK}" stroke-width="1.6"/>`;
    s += `<path d="M${x + 4} ${y + 30} H${x + CW - 4}" stroke="#6B4826" stroke-width="3" stroke-linecap="round" opacity="${slots[i] ? 0 : 1}"/>`;
    s += nest(x + CW / 2, y + CH - 8, CW - 14);
  }
  // corner posts & mid beam (the cutaway frame)
  s += `<rect x="${HX - 6}" y="${HY - 2}" width="10" height="${HH + 4}" fill="#8A5E33" stroke="${INK}" stroke-width="1.6"/><rect x="${HX + HW - 4}" y="${HY - 2}" width="10" height="${HH + 4}" fill="#8A5E33" stroke="${INK}" stroke-width="1.6"/>`;
  s += `<path d="M${HX + HW + 6} ${HY + 40} l9 0 l0 26 l-9 0" fill="#8A5E33" stroke="${INK}" stroke-width="1.2"/>`;
  // jagged cutaway edge of the front wall (left & right slivers)
  s += `<path d="M${HX - 6} ${HY} l-14 10 l6 18 l-8 22 l9 26 l-7 30 l10 30 l-8 26 l12 ${HH - 162} Z" fill="#C08A52" stroke="${INK}" stroke-width="1.6"/>`;
  // roof
  const RY = HY - 4, apex = HX + HW / 2;
  s += `<path d="M${HX - 26} ${RY + 6} L${apex} ${RY - 66} L${HX + HW + 26} ${RY + 6} Z" fill="#6E4A2A" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
  s += shingles(HX - 26, HX + HW + 26, RY - 66, RY + 6, apex);
  s += `<path d="M${HX - 30} ${RY + 8} L${apex} ${RY - 70} L${HX + HW + 30} ${RY + 8}" fill="none" stroke="#4E3219" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
  // stovepipe
  s += `<rect x="${apex + 58}" y="${RY - 52}" width="12" height="30" fill="#5E6B60" stroke="${INK}" stroke-width="1.5"/><rect x="${apex + 55}" y="${RY - 56}" width="18" height="6" fill="#4A5550" stroke="${INK}" stroke-width="1.5"/>`;
  s += `<path d="M${apex + 64} ${RY - 60} q-6 -8 2 -14 q8 -6 0 -14" fill="none" stroke="#C9CFC4" stroke-width="3" opacity=".8"/>`;
  s += signSVG(sign, apex, RY - 18, name);
  // lantern
  s += `<path d="M${HX + HW + 18} ${HY + 4} V${HY + 16}" stroke="${INK}" stroke-width="1"/><rect x="${HX + HW + 12}" y="${HY + 16}" width="12" height="16" rx="2" fill="#F2D27A" stroke="${INK}" stroke-width="1.4"/><circle cx="${HX + HW + 18}" cy="${HY + 24}" r="9" fill="#F7E3A0" opacity=".35"/>`;
  // seed stash sacks on the porch (purple S)
  const sack = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-12 -2 Q-13 14 -11 20 L11 20 Q13 14 12 -2 Z" fill="#C9AE7C" stroke="${INK}" stroke-width="1.5"/><path d="M-13 -2 Q-6 -9 0 -6 Q6 -9 13 -2 Q6 1 0 0 Q-6 1 -13 -2 Z" fill="#A98B58" stroke="${INK}" stroke-width="1.3"/><path d="M4.5 4 C3.5 2.8 2 2.3 0 2.3 C-2.6 2.3 -4 3.6 -4 5.2 C-4 7.3 -2 7.8 0 8.4 C2 9 4 9.6 4 11.6 C4 13.4 2.6 14.6 0 14.6 C-1.6 14.6 -3 14 -4.2 12.6" fill="none" stroke="#6B3FA0" stroke-width="2" stroke-linecap="round"/></g>`;
  s += sack(326, HY + HH - 18, .8) + sack(344, HY + HH - 15, .65);
  // pulley bucket rope
  s += `<path d="M${HX + 6} ${HY - 8} q-30 -6 -36 4" fill="none" stroke="${INK}" stroke-width="1.2"/><circle cx="${HX - 30}" cy="${HY - 2}" r="4" fill="#8A5E33" stroke="${INK}"/><path d="M${HX - 34} ${HY - 2} V${HY + 54}" stroke="#8C6A2E" stroke-width="1.2"/>
        <path d="M${HX - 42} ${HY + 54} h16 l-2 14 h-12 z" fill="#9AA3A8" stroke="${INK}" stroke-width="1.2"/>`;
  return s + `</svg>`;
}


const pct = (v, of) => `${(v / of * 100).toFixed(3)}%`;

// ---------- roof name sign styles ----------
let uid = 0;
const T = (x, y, txt, font, size, fill, len, extra = "") =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-weight="700" font-size="${size}" fill="${fill}"${len ? ` textLength="${len}" lengthAdjust="spacingAndGlyphs"` : ""} ${extra}>${txt}</text>`;
const fit = (txt, per, max) => Math.min(max, txt.length * per);
export const SIGN_STYLES = {
  // stitched linen patch, like the bird name plates
  patch: (x, y, t) => `<ellipse cx="${x}" cy="${y}" rx="42" ry="12" fill="#DCCDA6" stroke="${INK}" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="38.5" ry="9" fill="none" stroke="#6B3FA0" stroke-width="1" stroke-dasharray="2.5 1.6"/>`
    + T(x, y + 5, t, "Caveat,cursive", 13, "#6B3FA0", fit(t, 5.2, 68)),
  // carved plank hanging from two short chains
  plank: (x, y, t) => `<path d="M${x - 30} ${y - 22} V${y - 9} M${x + 30} ${y - 22} V${y - 9}" stroke="#4A5550" stroke-width="1.6" stroke-dasharray="2.4 1.4"/>`
    + `<rect x="${x - 46}" y="${y - 10}" width="92" height="22" rx="3" fill="#B98552" stroke="${INK}" stroke-width="1.6"/><path d="M${x - 42} ${y - 4} h30 M${x + 8} ${y + 7} h34 M${x - 40} ${y + 8} h16" stroke="#8E5E33" stroke-width="1" opacity=".7"/>`
    + `<circle cx="${x - 40}" cy="${y + 1}" r="1.3" fill="${INK}"/><circle cx="${x + 40}" cy="${y + 1}" r="1.3" fill="${INK}"/>`
    + T(x, y + 6, t, "Caveat,cursive", 15, "#3B2410", fit(t, 6, 72), `stroke="#E8C79A" stroke-width=".4" paint-order="stroke"`),
  // brass plaque with screws
  brass: (x, y, t) => `<defs><linearGradient id="thBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDD089"/><stop offset=".55" stop-color="#B88A2E"/><stop offset="1" stop-color="#D9B45E"/></linearGradient></defs>`
    + `<rect x="${x - 44}" y="${y - 10}" width="88" height="20" rx="3" fill="url(#thBrass)" stroke="#6E5019" stroke-width="1.6"/><rect x="${x - 41}" y="${y - 7}" width="82" height="14" rx="2" fill="none" stroke="#8A6A24" stroke-width=".7"/>`
    + `<circle cx="${x - 38}" cy="${y}" r="1.8" fill="#7A5A1C"/><circle cx="${x + 38}" cy="${y}" r="1.8" fill="#7A5A1C"/>`
    + T(x, y + 3.6, t.toUpperCase(), "Cinzel,Georgia,serif", 9, "#4A3410", fit(t, 5.4, 64)),
  // two crooked boards nailed up, hand painted, kid's-fort style
  boards: (x, y, t) => `<g transform="rotate(-4 ${x} ${y})"><rect x="${x - 48}" y="${y - 12}" width="96" height="12" fill="#9C6B3C" stroke="${INK}" stroke-width="1.4"/><rect x="${x - 45}" y="${y}" width="92" height="12" fill="#A8743F" stroke="${INK}" stroke-width="1.4" transform="rotate(2 ${x} ${y})"/>`
    + `<circle cx="${x - 43}" cy="${y - 6}" r="1.2" fill="${INK}"/><circle cx="${x + 43}" cy="${y - 6}" r="1.2" fill="${INK}"/><circle cx="${x - 40}" cy="${y + 7}" r="1.2" fill="${INK}"/><circle cx="${x + 41}" cy="${y + 8}" r="1.2" fill="${INK}"/>`
    + T(x, y + 5, t, "Caveat,cursive", 17, "#F6EBD5", fit(t, 6.6, 80)) + `</g>`,
  // bunting: one little flag per letter strung on twine
  bunting: (x, y, t) => {
    const chars = [...t.replace(/\s+/g, " ")].slice(0, 16), n = chars.length, step = Math.min(15, 150 / n), x0 = x - step * (n - 1) / 2;
    const cols = ["#6B3FA0", "#A82A2E", "#2F6FB0", "#4F8A3C", "#C8962E"];
    let g = `<path d="M${x0 - 10} ${y - 12} Q${x} ${y - 4} ${x0 + step * (n - 1) + 10} ${y - 12}" fill="none" stroke="#6B5638" stroke-width="1"/>`;
    chars.forEach((c, i) => {
      if (c === " ") return;
      const cx = x0 + i * step, sag = 8 * (1 - ((cx - x) / (step * n / 2 + 10)) ** 2), top = y - 12 + sag * .5;
      g += `<path d="M${cx - step / 2 + .6} ${top} h${step - 1.2} l${-(step - 1.2) / 2} 19 z" fill="${cols[i % cols.length]}" stroke="${INK}" stroke-width=".8"/>`
        + `<text x="${cx}" y="${top + 9.5}" text-anchor="middle" font-family="Libre Franklin,sans-serif" font-weight="700" font-size="9.5" fill="#fff">${c.toUpperCase()}</text>`;
    });
    return g;
  },
  // painted arch over the top of the house
  arch: (x, y, t, id = `thArc${++uid}`) => `<path id="${id}" d="M${x - 50} ${y + 14} Q${x} ${y - 22} ${x + 50} ${y + 14}" fill="none"/>`
    + `<path d="M${x - 56} ${y + 10} Q${x} ${y - 34} ${x + 56} ${y + 10} L${x + 46} ${y + 18} Q${x} ${y - 14} ${x - 46} ${y + 18} Z" fill="#EEF1E6" stroke="${INK}" stroke-width="1.5"/>`
    + `<text font-family="Caveat,cursive" font-weight="700" font-size="14" fill="#25332C" dy="-1"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${t}</textPath></text>`,
};
export const signSVG = (style, x, y, txt) => (SIGN_STYLES[style] || SIGN_STYLES.patch)(x, y, escT(txt));
export const SIGN_LABEL = { patch: "Stitched patch", plank: "Hanging plank", brass: "Brass plaque", boards: "Nailed-up boards", bunting: "Letter bunting", arch: "Painted arch" };

// slots: up to 6 of { bird, stage, nick, id, selected } (null = empty cubby).
export function treehouseHTML(slots, { sign = "boards", name = "Birdhouse Inn" } = {}) {
  seed = 7;
  let html = scene(slots, sign, name);
  slots.forEach((m, i) => {
    const [x, y] = cell(i);
    html += `<button type="button" class="th-cubby${m?.selected ? " sel" : ""}" ${m ? `data-id="${m.id}" aria-label="${escT(m.nick || m.bird.name)}"` : 'disabled aria-label="Empty cubby"'} style="left:${pct(x, W)};top:${pct(y, H)};width:${pct(CW, W)};height:${pct(CH, H)}">`
      + (m ? `<span class="th-b">${stageSVG(m.bird, m.stage)}</span>` : "") + `</button>`;
    if (m?.nick) html += `<span class="th-tag" style="left:${pct(x + CW / 2, W)};top:${pct(y - 8, H)}">${escT(m.nick)}</span>`;
  });
  return html;
}

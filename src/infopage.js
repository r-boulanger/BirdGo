// Bird info pages (look B, "Field Guide Card"): a big photo, then tabs for
// About, Where & when, and My sightings. Opened from the Field Journal.
//
// Photos and the short Wikipedia intro load live from Wikipedia / Wikimedia Commons
// in the player's browser (freely licensed, credited on the page). Nothing is copied
// from eBird; we only link to it.
import { birdSVG } from "./seedtoss.js";
import { stageSVG, stageOf, needed, nextStage, STAGE_LABEL, POINTS } from "./stages.js";

const MONTHS = "JFMAMJJASOND".split("");
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ABUND = ["Not here", "Scarce", "Fair", "Common"];
const HAB = { town: "in town", forest: "in woods", field: "in fields", marsh: "in marshes", freshwater: "on rivers & ponds", coast: "on the coast" };
const TIME = { dawn: "dawn", day: "daytime", dusk: "dusk", night: "night" };
const WX = { cold: "cold", snow: "snow", rain: "rain", wind: "wind", storm: "storms", fog: "fog", clear: "clear skies" };
const CACHE = "birdgo.photos.v1";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const list = a => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

// Link names built from the bird's common name.
export function wikiTitle(name) {
  const keep = /^(American|European|Baltimore|Eastern)$/;
  return name.split(" ").map((w, i) => i === 0 || keep.test(w) ? w : w.toLowerCase()).join("_");
}
export const links = (bird, info) => ({
  aab: `https://www.allaboutbirds.org/guide/${bird.name.replace(/ /g, "_").replace(/'/g, "")}`,
  ebird: info?.ebird ? `https://ebird.org/species/${info.ebird}` : `https://ebird.org/explore`,
  wiki: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle(bird.name))}`,
});

// A sentence about when and where to find it, from the spawn data.
export function whereWhen(bird) {
  const m = bird.months, here = m.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
  let when;
  if (here.length === 12) {
    const seasons = { winter: [11, 0, 1], spring: [2, 3, 4], summer: [5, 6, 7], fall: [8, 9, 10] };
    const avg = Object.fromEntries(Object.entries(seasons).map(([k, ms]) => [k, ms.reduce((a, i) => a + m[i], 0) / 3]));
    const top = Math.max(...Object.values(avg)), best = Object.keys(avg).filter(k => avg[k] === top);
    when = best.length === 4 ? "Here all year" : `Here all year, most in ${list(best)}`;
  }
  else if (!here.length) when = "Rarely seen here";
  else {
    // Split into runs of months it's here (a run may wrap past December).
    const start = here.find(i => m[(i + 11) % 12] === 0), runs = [];
    for (let k = 0, i = start; k < 12; k++, i = (i + 1) % 12) {
      if (m[i] > 0) { if (m[(i + 11) % 12] > 0 && runs.length) runs[runs.length - 1][1] = i; else runs.push([i, i]); }
    }
    when = "Here " + list(runs.map(([a, b]) => a === b ? MONTH_NAMES[a] : `${MONTH_NAMES[a]} to ${MONTH_NAMES[b]}`));
  }
  const parts = [when, `found ${list(bird.habitats.map(h => HAB[h] || h))}`, `active at ${list(bird.active.map(a => TIME[a] || a))}`];
  if (bird.likes.length) parts.push(`shows up more in ${list(bird.likes.map(w => WX[w] || w))}`);
  if (bird.dislikes.length) parts.push(`hides in ${list(bird.dislikes.map(w => WX[w] || w))}`);
  return parts.join(" · ");
}

// ---------- photo + Wikipedia intro (cached on the phone) ----------
function readCache() { try { return JSON.parse(localStorage.getItem(CACHE)) || {}; } catch { return {}; } }
function writeCache(c) { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* ignore */ } }
const stripTags = h => { const d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").trim().replace(/\s+/g, " "); };

export async function fetchPhoto(bird) {
  const cache = readCache();
  if (cache[bird.id] && Date.now() - cache[bird.id].at < 30 * 86400000) return cache[bird.id];
  const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle(bird.name))}?redirect=true`);
  if (!r.ok) throw new Error("wiki " + r.status);
  const s = await r.json();
  const out = { at: Date.now(), extract: s.extract || "", page: s.content_urls?.mobile?.page || s.content_urls?.desktop?.page || "" };
  const img = s.originalimage?.source || s.thumbnail?.source;
  if (img) {
    out.src = s.thumbnail?.source ? s.thumbnail.source.replace(/\/\d+px-/, "/800px-") : img;
    if (s.originalimage && s.originalimage.width < 800) out.src = img;
    const file = decodeURIComponent(img.split("/").pop());
    out.filePage = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;
    try {
      const q = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&titles=File:${encodeURIComponent(file)}`);
      const meta = Object.values((await q.json()).query.pages)[0].imageinfo[0].extmetadata;
      out.artist = stripTags(meta.Artist?.value).slice(0, 80);
      out.license = stripTags(meta.LicenseShortName?.value);
    } catch { /* credit falls back to "Wikimedia Commons" */ }
  }
  cache[bird.id] = out; writeCache(cache);
  return out;
}

// ---------- growing up panel ----------
function growPanel(bird, entry, growth) {
  const st = stageOf(entry), need = needed(entry), have = entry.growth || 0, next = nextStage(st);
  const bag = growth?.bag ?? 0;
  const bar = need ? `<div class="gp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${need}" aria-valuenow="${have}"><span style="width:${Math.min(100, have / need * 100)}%"></span></div>
    <div class="small">${have} / ${need} growth to ${STAGE_LABEL[next]}</div>` : `<div class="small">Fully grown!</div>`;
  const btn = next ? `<button class="gp-feed" type="button" id="ipFeed" ${bag > 0 ? "" : "disabled"}>Feed 1 seed pouch <span>+${POINTS.feed}</span></button>
    <div class="small">${bag > 0 ? `${bag} pouches in your bag · catching another ${esc(bird.name.split(" ").pop())} gives +${POINTS.catch}` : "Your seed bag is empty. Find a seed stash on the map."}</div>` : "";
  return `<div class="gp" id="ipGrow">
    <div class="gp-art">${stageSVG(bird, st)}</div>
    <div class="gp-main"><div class="gp-stage hand">Your ${STAGE_LABEL[st].toLowerCase()}</div>${bar}${btn}</div>
    <div class="gp-msg hand" id="ipGrowMsg" hidden></div>
  </div>`;
}

// ---------- the page ----------
// growth: { bag, onFeed } lets the page show the feeding panel for a logged bird.
export function renderInfo(host, bird, info, entry, onClose, growth) {
  const L = links(bird, info), i = info || {};
  const stamp = `<span class="stamp ${bird.rarity}">${bird.rarity}</span>`;
  const bars = bird.months.map((v, k) => `<div class="mo" title="${MONTH_NAMES[k]}: ${ABUND[v]}"><div class="bar"><span class="a${v}"></span></div>${MONTHS[k]}</div>`).join("");
  const date = d => new Date(d.when).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d => new Date(d.when).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sight = d => `<li><b>${date(d)}</b>, ${time(d)}<br><span class="small">${esc(d.place || "")}${d.weather ? " · " + esc(d.weather) : ""}${d.timeOfDay ? " · " + esc(d.timeOfDay) : ""}</span></li>`;

  host.innerHTML = `
  <div class="ip">
    <div class="ip-photo" id="ipPhoto">
      <div class="ip-ph">${birdSVG(bird)}<span class="small">Loading photo…</span></div>
      <button class="x ip-back" type="button" id="ipBack" aria-label="Back to journal">←</button>
      <div class="ip-credit" id="ipCredit" hidden></div>
    </div>
    <div class="ip-body">
      <div class="ip-head">
        <div><h2 class="hand">${esc(bird.name)}</h2><div class="small"><i>${esc(bird.sci)}</i> · ${esc(bird.group)}</div></div>
        ${stamp}
      </div>
      ${entry ? growPanel(bird, entry, growth) : ""}
      <div class="ip-tabs" role="tablist">
        <button type="button" role="tab" data-tab="about" aria-selected="true">About</button>
        <button type="button" role="tab" data-tab="where" aria-selected="false">Where &amp; when</button>
        <button type="button" role="tab" data-tab="mine" aria-selected="false">My sightings</button>
      </div>
      <section class="ip-pane" data-pane="about">
        <p>${esc(bird.fact)}</p>
        <div class="ip-grid">
          <div><span>Size</span>${esc(i.length || "?")} long, ${esc(i.wingspan || "?")} wings</div>
          <div><span>Weight</span>${esc(i.weight || "?")}</div>
          <div><span>Eats</span>${esc(i.diet || "?")}</div>
          <div><span>Sounds like</span>${esc(i.voice || "?")}</div>
          <div class="wide"><span>Nest</span>${esc(i.nest || "?")}</div>
        </div>
        ${(i.facts || []).length ? `<div class="ip-facts hand">${i.facts.map(f => `<div>• ${esc(f)}</div>`).join("")}</div>` : ""}
        <div class="ip-wiki" id="ipWiki" hidden></div>
      </section>
      <section class="ip-pane" data-pane="where" hidden>
        <div class="ip-label">Around Brunswick, month by month</div>
        <div class="ip-months">${bars}</div>
        <div class="ip-key small"><span><i class="a1"></i>Scarce</span><span><i class="a2"></i>Fair</span><span><i class="a3"></i>Common</span></div>
        <p>${esc(whereWhen(bird))}.</p>
      </section>
      <section class="ip-pane" data-pane="mine" hidden>
        ${entry ? `<p class="hand big">Logged ${entry.count}×</p>
          <ul class="ip-sight">${sight(entry.first)}${entry.count > 1 ? sight(entry.last) : ""}</ul>
          <p class="small">${entry.count > 1 ? "Your first and most recent sightings." : "Your first sighting."}</p>` : `<p>You haven't logged this bird yet.</p>`}
      </section>
      <div class="ip-links">
        <a href="${L.aab}" target="_blank" rel="noopener">All About Birds ↗</a>
        <a href="${L.ebird}" target="_blank" rel="noopener">eBird ↗</a>
        <a href="${L.wiki}" target="_blank" rel="noopener">Wikipedia ↗</a>
      </div>
    </div>
  </div>`;

  const $ = s => host.querySelector(s);
  $("#ipBack").onclick = onClose;
  const feed = $("#ipFeed"); if (feed && growth?.onFeed) feed.onclick = growth.onFeed;
  host.querySelectorAll(".ip-tabs button").forEach(b => b.onclick = () => {
    host.querySelectorAll(".ip-tabs button").forEach(x => x.setAttribute("aria-selected", x === b));
    host.querySelectorAll(".ip-pane").forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
  });

  fetchPhoto(bird).then(p => {
    if (!host.isConnected) return;
    if (p.src) {
      const img = new Image(); img.alt = bird.name; img.className = "ip-img";
      img.onload = () => { $(".ip-ph")?.remove(); $("#ipPhoto").prepend(img); };
      img.onerror = () => { const s = $(".ip-ph .small"); if (s) s.textContent = "Photo unavailable"; };
      img.src = p.src;
      const c = $("#ipCredit");
      c.innerHTML = `<a href="${esc(p.filePage)}" target="_blank" rel="noopener">Photo: ${esc(p.artist || "Wikimedia Commons")}${p.license ? " · " + esc(p.license) : ""}</a>`;
      c.hidden = false;
    } else { const s = $(".ip-ph .small"); if (s) s.textContent = "No photo yet"; }
    if (p.extract) {
      const w = $("#ipWiki");
      w.innerHTML = `<div class="ip-label">From Wikipedia</div><p>${esc(p.extract)}</p><a class="small" href="${esc(p.page || L.wiki)}" target="_blank" rel="noopener">Read more on Wikipedia (CC BY-SA) ↗</a>`;
      w.hidden = false;
    }
  }).catch(() => { const s = $(".ip-ph .small"); if (s) s.textContent = "Photo needs an internet connection"; });
}

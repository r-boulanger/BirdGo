// BirdGo app: GPS map, birds spawning around you, Seed Toss, field journal.
import { pickSpawns, timeOfDay } from "./spawn.js";
import { fetchConditions } from "./weather.js";
import { nearbyHabitats } from "./habitat.js";
import { seedToss, birdSVG } from "./seedtoss.js";
import * as Journal from "./journal.js";

const BRUNSWICK = [43.9145, -69.9653];        // Brunswick, Maine town center (demo mode start)
const CATCH_RANGE_M = 70;                      // how close you must be to toss
const SPAWN_COUNT = 6;
const SPAWN_LIFETIME_MS = 8 * 60 * 1000;
const WEATHER_LABEL = { clear: "☀ Clear", cloudy: "☁ Cloudy", fog: "≋ Fog", rain: "☂ Rain", snow: "❄ Snow", storm: "⚡ Storm" };
const HAB_LABEL = { town: "Town", forest: "Woods", field: "Fields", marsh: "Marsh", freshwater: "River/pond", coast: "Coast" };

const $ = s => document.querySelector(s);
let birds = [], map, meMarker, me = null, demo = false, cond = null, condAt = null, habitats = ["town"], habAt = null;
let spawns = [], journal = Journal.load(), activeToss = null, watchId = null;

// ---------- helpers ----------
const toRad = d => d * Math.PI / 180;
function distM(a, b) {
  const R = 6371000, dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function offset([lat, lon], meters, bearingDeg) {
  const b = toRad(bearingDeg);
  return [lat + (meters * Math.cos(b)) / 111320, lon + (meters * Math.sin(b)) / (111320 * Math.cos(toRad(lat)))];
}
let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
}
// Rough sunrise/sunset for mid-coast Maine by month (local clock time), used if the weather lookup fails.
const SUN = [[7.2, 16.4], [6.8, 17.0], [6.9, 18.7], [6.2, 19.3], [5.3, 19.9], [4.9, 20.3], [5.2, 20.3], [5.8, 19.7], [6.3, 18.8], [6.9, 17.8], [6.5, 16.3], [7.0, 16.0]];
function fallbackConditions() {
  const now = new Date(), m = now.getMonth(), h = now.getHours() + now.getMinutes() / 60;
  return { month: m + 1, timeOfDay: timeOfDay(h, ...SUN[m]), weather: "cloudy", cold: m <= 1 || m === 11, windy: false };
}

// ---------- conditions (weather + surroundings) ----------
async function refreshConditions(force = false) {
  const stale = !cond || !condAt || Date.now() - condAt.t > 10 * 60 * 1000 || distM(condAt.at, me) > 1500;
  if (stale || force) {
    try { cond = await fetchConditions(me[0], me[1]); }
    catch { cond = cond || fallbackConditions(); }
    condAt = { t: Date.now(), at: me };
  }
  if (!habAt || distM(habAt, me) > 300 || force) {
    habAt = me;
    try { habitats = await nearbyHabitats(me[0], me[1]); } catch { /* keep the last known */ }
  }
  cond.habitats = habitats;
  const temp = cond.temperatureC != null ? ` · ${Math.round(cond.temperatureC * 9 / 5 + 32)}°F` : "";
  $("#wx").textContent = `${WEATHER_LABEL[cond.weather] || cond.weather}${temp} · ${cond.timeOfDay[0].toUpperCase() + cond.timeOfDay.slice(1)}`;
  $("#hab").hidden = false; $("#hab").textContent = habitats.map(h => HAB_LABEL[h] || h).join(" · ");
}

// ---------- spawns ----------
function birdIcon(s) {
  const d = me ? Math.round(distM(me, s.at)) : 0;
  return L.divIcon({
    className: "", iconSize: [0, 0],
    html: `<div class="bm ${s.bird.rarity} ${d > CATCH_RANGE_M ? "far" : ""}"><span class="dot">${birdSVG(s.bird)}</span><span class="lbl">${s.bird.name.split(" ").slice(-1)[0]}</span></div>`,
  });
}
function addSpawn(bird) {
  // Keep birds at least ~40 m apart so their markers don't overlap.
  let at;
  for (let i = 0; i < 12; i++) {
    at = offset(me, 35 + Math.random() * 140, Math.random() * 360);
    if (spawns.every(o => distM(o.at, at) > 40)) break;
  }
  const s = { bird, at, born: Date.now() };
  s.marker = L.marker(at, { icon: birdIcon(s), keyboard: true, title: bird.name }).addTo(map).on("click", () => tapBird(s));
  spawns.push(s);
}
function removeSpawn(s) { map.removeLayer(s.marker); spawns = spawns.filter(x => x !== s); }
function tendSpawns(reset = false) {
  if (!cond || !me) return;
  for (const s of [...spawns]) if (reset || Date.now() - s.born > SPAWN_LIFETIME_MS || distM(me, s.at) > 320) removeSpawn(s);
  const need = SPAWN_COUNT - spawns.length;
  if (need > 0) for (const b of pickSpawns(birds, cond, need)) addSpawn(b);
  for (const s of spawns) s.marker.setIcon(birdIcon(s));
}

// ---------- moving ----------
async function moveTo(latlng, first = false) {
  me = latlng;
  if (!meMarker) meMarker = L.marker(me, { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
  else meMarker.setLatLng(me);
  if (first) map.setView(me, 17);
  await refreshConditions();
  tendSpawns();
}

// ---------- encounter ----------
function tapBird(s) {
  if (activeToss) return;
  const d = Math.round(distM(me, s.at));
  if (d > CATCH_RANGE_M) {
    if (!demo) { toast(`${s.bird.name} is ${d} m away. Walk closer!`); return; }
    // Demo mode: walk over to the bird first.
    toast(`You walk ${d} m over to the ${s.bird.name}…`, 1400);
    const target = [s.at[0] + (me[0] - s.at[0]) * 0.25, s.at[1] + (me[1] - s.at[1]) * 0.25];
    map.panTo(target);
    moveTo(target).then(() => setTimeout(() => { if (spawns.includes(s)) tapBird(s); }, 700));
    return;
  }
  $("#encName").textContent = s.bird.name;
  $("#encMeta").textContent = `${s.bird.rarity} · ${s.bird.sci}`;
  $("#encounter").hidden = false;
  activeToss = seedToss($("#tossHost"), s.bird, r => {
    activeToss = null; $("#encounter").hidden = true;
    if (r.caught) { removeSpawn(s); logCatch(s.bird); }
    else { removeSpawn(s); toast(r.outOfPouches ? "Out of seed pouches. It flew off." : `The ${s.bird.name} flew away.`); tendSpawns(); }
  });
}
$("#encClose").onclick = () => { activeToss?.stop(); activeToss = null; $("#encounter").hidden = true; };

function logCatch(bird) {
  const now = new Date();
  const details = {
    when: now.toISOString(),
    weather: cond?.weather, timeOfDay: cond?.timeOfDay,
    place: demo ? "Brunswick, ME (demo)" : `${me[0].toFixed(3)}, ${me[1].toFixed(3)}`,
  };
  const e = Journal.log(journal, bird, details);
  updateCount();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  $("#entryBody").innerHTML = `<div class="hand big" style="text-align:center">${e.count === 1 ? "New for your journal!" : `Logged again (${e.count}×)`}</div>
    <div class="entry"><span class="stamp ${bird.rarity}">${bird.rarity}</span>${birdSVG(bird)}<div><div class="n">${bird.name}</div><div class="s">${bird.sci}</div><p>${bird.fact}</p></div>
    <div class="meta"><span>${date} · ${time}</span><span>${WEATHER_LABEL[cond?.weather] || ""}</span><span>${details.place}</span></div></div>`;
  $("#entry").hidden = false;
  tendSpawns();
}
$("#entryOk").onclick = () => ($("#entry").hidden = true);

// ---------- journal ----------
function updateCount() { $("#jcount").textContent = Object.keys(journal).length; }
function openJournal() {
  const seen = birds.filter(b => journal[b.id]), unseen = birds.filter(b => !journal[b.id]);
  $("#jsum").textContent = `${seen.length} of ${birds.length} Brunswick birds found`;
  const row = (b, e) => `<div class="jrow ${e ? "" : "unseen"}">${birdSVG(b)}<div><div class="n">${e ? b.name : "???"}</div><div class="small">${e ? b.sci : b.rarity}</div></div><div class="c">${e ? `${e.count}× · ${new Date(e.first.when).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</div></div>`;
  $("#jlist").innerHTML = seen.map(b => row(b, journal[b.id])).join("") + unseen.map(b => row(b)).join("");
  $("#journal").hidden = false;
}
$("#openJournal").onclick = openJournal;
$("#jClose").onclick = () => ($("#journal").hidden = true);

// ---------- start ----------
function initMap() {
  map = L.map("map", { zoomControl: false, attributionControl: true }).setView(BRUNSWICK, 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  map.on("click", e => { if (demo && !activeToss) moveTo([e.latlng.lat, e.latlng.lng]); });
}
$("#recenter").onclick = () => me && map.setView(me, Math.max(map.getZoom(), 16));
$("#refresh").onclick = async () => { if (!me) return; await refreshConditions(true); tendSpawns(true); toast("New birds around you"); };

function startDemo() {
  demo = true; $("#start").hidden = true;
  moveTo(BRUNSWICK, true).then(() => toast("Demo mode: tap the map to walk around Brunswick.", 4500));
}
$("#demo").onclick = startDemo;
$("#go").onclick = () => {
  if (!("geolocation" in navigator)) { $("#startErr").textContent = "This browser can't share location. Try demo mode."; $("#startErr").hidden = false; return; }
  $("#go").textContent = "Finding you…";
  let first = true;
  watchId = navigator.geolocation.watchPosition(
    p => { if (first) { $("#start").hidden = true; } moveTo([p.coords.latitude, p.coords.longitude], first); first = false; },
    err => {
      $("#go").textContent = "Start birding";
      $("#startErr").hidden = false;
      $("#startErr").textContent = err.code === 1
        ? "Location is blocked. Allow location for this site in your browser settings, or try demo mode."
        : "Couldn't find your location. Step outside or try demo mode.";
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );
};

(async function boot() {
  const res = await fetch("data/birds-brunswick-me.json");
  birds = (await res.json()).birds;
  initMap(); updateCount();
  setInterval(() => { if (me) refreshConditions().then(() => tendSpawns()); }, 60 * 1000);
})();

// BirdGo app: GPS map, birds spawning around you, Seed Toss, field journal.
import { pickSpawns, timeOfDay } from "./spawn.js";
import { fetchConditions } from "./weather.js";
import { nearbyHabitats } from "./habitat.js";
import { seedToss, birdSVG, TOSS } from "./seedtoss.js";
import * as Journal from "./journal.js";
import * as Seed from "./seed.js";
import { renderInfo } from "./infopage.js";
import { stageSVG, stageOf, requirement, evolve, STAGE_LABEL } from "./stages.js";

const BRUNSWICK = [43.9145, -69.9653];        // Brunswick, Maine town center (demo mode start)
const CATCH_RANGE_M = 70;                      // how close you must be to toss
const SPAWN_COUNT = 6;
const SPAWN_LIFETIME_MS = 8 * 60 * 1000;
const WEATHER_LABEL = { clear: "☀ Clear", cloudy: "☁ Cloudy", fog: "≋ Fog", rain: "☂ Rain", snow: "❄ Snow", storm: "⚡ Storm" };
const HAB_LABEL = { town: "Town", forest: "Woods", field: "Fields", marsh: "Marsh", freshwater: "River/pond", coast: "Coast" };

const $ = s => document.querySelector(s);
let birds = [], map, meMarker, me = null, demo = false, cond = null, condAt = null, habitats = ["town"], habAt = null;
let spawns = [], journal = Journal.load(), activeToss = null, watchId = null;
let seed = Seed.load(), stashMarkers = new Map(), info = {}, lastLogged = null;

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
  // Keep birds at least ~55 m apart so their markers don't overlap.
  let at;
  for (let i = 0; i < 12; i++) {
    at = offset(me, 35 + Math.random() * 140, Math.random() * 360);
    if (spawns.every(o => distM(o.at, at) > 55) && Seed.stashesNear(at[0], at[1], 230).every(st => distM(st.at, at) > 40)) break;
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

// ---------- birdseed stashes ----------
function updateSeed() {
  $("#seedCount").textContent = seed.bag;
  $("#seedChip").classList.toggle("low", seed.bag <= 3);
}
function stashIcon(st) {
  const ready = Seed.isReady(seed, st), d = me ? Math.round(distM(me, st.at)) : 0;
  const lbl = ready ? "Seed" : `${Math.ceil(Seed.readyIn(seed, st) / 60000)} min`;
  return L.divIcon({
    className: "", iconSize: [0, 0],
    html: `<div class="sm ${ready ? "" : "empty"} ${d > Seed.SEED.rangeM ? "far" : ""}"><svg viewBox="0 0 64 64"><use href="#stashArt" width="64" height="64"/></svg><span class="lbl">${lbl}</span></div>`,
  });
}
function renderStashes() {
  if (!me || !map) return;
  const near = Seed.stashesNear(me[0], me[1], 450), keep = new Set();
  for (const st of near) {
    keep.add(st.id);
    let m = stashMarkers.get(st.id);
    if (!m) {
      m = L.marker(st.at, { icon: stashIcon(st), keyboard: true, title: "Seed stash", zIndexOffset: -100 }).addTo(map).on("click", () => tapStash(st));
      stashMarkers.set(st.id, m);
    } else m.setIcon(stashIcon(st));
  }
  for (const [id, m] of stashMarkers) if (!keep.has(id)) { map.removeLayer(m); stashMarkers.delete(id); }
}
function tapStash(st) {
  if (activeToss) return;
  if (!Seed.isReady(seed, st)) { toast(`This stash is empty. It refills in ${Math.ceil(Seed.readyIn(seed, st) / 60000)} min.`); return; }
  const d = Math.round(distM(me, st.at));
  if (d > Seed.SEED.rangeM) {
    if (!demo) { toast(`Seed stash is ${d} m away. Walk closer!`); return; }
    toast(`You walk ${d} m over to the seed stash…`, 1400);
    map.panTo(st.at);
    moveTo(st.at).then(() => setTimeout(() => tapStash(st), 600));
    return;
  }
  if (seed.bag >= Seed.SEED.maxBag) { toast(`Your seed bag is full (${Seed.SEED.maxBag} pouches).`); return; }
  const got = Seed.collect(seed, st);
  updateSeed(); renderStashes();
  const chip = $("#seedChip"); chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop");
  toast(`+${got} seed pouches! You have ${seed.bag}.`);
}

// ---------- moving ----------
async function moveTo(latlng, first = false) {
  me = latlng;
  if (!meMarker) meMarker = L.marker(me, { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [18, 18] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
  else meMarker.setLatLng(me);
  if (first) map.setView(me, 17);
  renderStashes();
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
  if (seed.bag <= 0) { toast("Your seed bag is empty. Walk to a seed stash on the map to fill it.", 3600); return; }
  $("#encName").textContent = s.bird.name;
  $("#encMeta").textContent = `${s.bird.rarity} · ${s.bird.sci}`;
  $("#encounter").hidden = false;
  activeToss = seedToss($("#tossHost"), s.bird, r => {
    activeToss = null; $("#encounter").hidden = true;
    if (r.caught) { removeSpawn(s); logCatch(s.bird); }
    else { removeSpawn(s); toast(r.outOfPouches && seed.bag <= 0 ? "Out of seed! Find a seed stash on the map." : `The ${s.bird.name} flew away.`); tendSpawns(); }
  }, {
    pouches: seed.bag,
    onThrow: () => { Seed.spend(seed); updateSeed(); },
    outMsg: seed.bag < (TOSS[s.bird.rarity] || TOSS.common).pouches ? "Your seed bag is empty. It flew off." : undefined,
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
  lastLogged = bird;
  if (e.count === 1) e.stage = "infant";
  const req = requirement(bird, e), justReady = req && req.ready && e.count === req.catches;
  Journal.save(journal);
  updateCount();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  $("#entryBody").innerHTML = `<div class="hand big" style="text-align:center">${e.count === 1 ? "New for your journal! A new infant to raise." : justReady ? `Ready to evolve into an ${STAGE_LABEL[req.next].toLowerCase()}! Costs ${req.seed} seed pouches.` : req && !req.ready ? `Logged again · ${req.catches - e.count} more to evolve` : `Logged again (${e.count}×)`}</div>
    <div class="entry"><span class="stamp ${bird.rarity}">${bird.rarity}</span>${stageSVG(bird, stageOf(e))}<div><div class="n">${bird.name}</div><div class="s">${bird.sci}</div><p>${bird.fact}</p></div>
    <div class="meta"><span>${date} · ${time}</span><span>${WEATHER_LABEL[cond?.weather] || ""}</span><span>${details.place}</span></div></div>`;
  $("#entry").hidden = false;
  tendSpawns();
}
$("#entryOk").onclick = () => ($("#entry").hidden = true);
$("#entryInfo").onclick = () => { $("#entry").hidden = true; if (lastLogged) openInfo(lastLogged); };

// ---------- info pages ----------
function openInfo(bird, keepScroll = false) {
  const host = $("#infoHost"), y = host.scrollTop;
  renderInfo(host, bird, info[bird.id], journal[bird.id], () => { $("#info").hidden = true; if (!$("#journal").hidden) openJournal(); }, {
    bag: seed.bag,
    onFeed: () => feedBird(bird),
  });
  host.scrollTop = keepScroll ? y : 0;
  $("#info").hidden = false;
}
function feedBird(bird) {
  const e = journal[bird.id];
  const done = e && evolve(bird, e, seed.bag);
  if (!done) return;
  Seed.spend(seed, done.cost); updateSeed();
  Journal.save(journal);
  openInfo(bird, true);
  const msg = $("#ipGrowMsg");
  msg.textContent = `Your ${bird.name.split(" ").pop()} evolved into an ${STAGE_LABEL[done.stage].toLowerCase()}!`;
  msg.classList.add("grew"); msg.hidden = false;
  $("#ipGrow .gp-art").classList.add("grew");
}

// ---------- journal ----------
function updateCount() { $("#jcount").textContent = Object.keys(journal).length; }
function openJournal() {
  const seen = birds.filter(b => journal[b.id]), unseen = birds.filter(b => !journal[b.id]);
  $("#jsum").textContent = `${seen.length} of ${birds.length} Brunswick birds found`;
  const row = (b, e) => `<button type="button" class="jrow ${e ? "" : "unseen"}" data-id="${b.id}">${e ? stageSVG(b, stageOf(e)) : birdSVG(b)}<div><div class="n">${e ? b.name : "???"}</div><div class="small">${e ? STAGE_LABEL[stageOf(e)] : b.rarity}</div></div><div class="c">${e ? `${e.count}× · ${new Date(e.first.when).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ›` : ""}</div></button>`;
  $("#jlist").innerHTML = seen.map(b => row(b, journal[b.id])).join("") + unseen.map(b => row(b)).join("");
  $("#jlist").querySelectorAll(".jrow").forEach(r => r.onclick = () => {
    const b = birds.find(x => x.id === r.dataset.id);
    if (journal[b.id]) openInfo(b); else toast("Catch this bird to unlock its page.");
  });
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
function showStartError(msg) {
  $("#go").textContent = "Try again"; $("#go").disabled = false;
  $("#startErr").innerHTML = msg; $("#startErr").hidden = false;
}
const IN_APP = /FBAN|FBAV|Instagram|Line\/|GSA\/|Snapchat|Twitter|LinkedInApp|; wv\)|Claude/i.test(navigator.userAgent)
  || (/iPhone|iPad/.test(navigator.userAgent) && !/Safari\//.test(navigator.userAgent));
const UA = navigator.userAgent;
const IOS = /iPhone|iPad|iPod/.test(UA);
const ANDROID = /Android/.test(UA);
const WINDOWS = /Windows/.test(UA);
const MAC = /Macintosh/.test(UA) && !IOS;
const BROWSER = /EdgiOS|EdgA|Edg\//.test(UA) ? "Edge" : /CriOS|Chrome\//.test(UA) ? "Chrome" : /FxiOS|Firefox\//.test(UA) ? "Firefox" : /Safari\//.test(UA) ? "Safari" : "your browser";
// Step-by-step help for turning location on, for this phone/computer and browser.
const HOW_TO_ALLOW = (() => {
  if (IOS) {
    const app = BROWSER === "Safari" ? "Safari Websites" : BROWSER === "your browser" ? "your browser" : BROWSER;
    return `On iPhone: open <b>Settings → Privacy &amp; Security → Location Services</b>, make sure it's on, then tap <b>${app}</b> and choose <b>While Using the App</b>. Then reload this page.`;
  }
  if (ANDROID) {
    return `On Android: make sure <b>Location</b> is on (swipe down from the top of the screen). Then open <b>Settings → Apps → ${BROWSER === "your browser" ? "your browser" : BROWSER} → Permissions → Location → Allow only while using the app</b>. `
      + `In ${BROWSER}, tap the icon left of the web address, then <b>Permissions → Location → Allow</b>. Then reload this page.`;
  }
  if (WINDOWS) {
    return `On Windows: open <b>Settings → Privacy &amp; security → Location</b> and turn on <b>Location services</b> and <b>Let desktop apps access your location</b>. `
      + `Then in ${BROWSER}, click the lock icon left of the web address, set <b>Location</b> to <b>Allow</b>, and reload this page.`;
  }
  if (MAC) {
    return `On a Mac: open <b>System Settings → Privacy &amp; Security → Location Services</b> and turn it on for <b>${BROWSER === "Edge" ? "Microsoft Edge" : BROWSER === "Chrome" ? "Google Chrome" : BROWSER}</b>. `
      + `Then click the lock icon left of the web address, set <b>Location</b> to <b>Allow</b>, and reload this page.`;
  }
  return "Click the lock icon left of the web address, set <b>Location</b> to <b>Allow</b>, check your device's location is on, and reload this page.";
})();

function startTracking() {
  let first = true, watchdog;
  const onPos = p => {
    clearTimeout(watchdog);
    if (first) { $("#start").hidden = true; first = false; moveTo([p.coords.latitude, p.coords.longitude], true); }
    else moveTo([p.coords.latitude, p.coords.longitude]);
  };
  const onErr = err => {
    clearTimeout(watchdog);
    if (!first) return;  // already playing; ignore a hiccup
    if (err.code === 1) showStartError("Location is blocked for this site, so your browser didn't ask. " + HOW_TO_ALLOW + " Or try demo mode.");
    else if (err.code === 3) showStartError("Couldn't get a GPS fix in time. Step outside or near a window and tap Try again, or try demo mode.");
    else showStartError("Your phone couldn't find your location. Check that location is turned on, then tap Try again. " + HOW_TO_ALLOW);
  };
  // If neither answer nor prompt shows up, explain instead of waiting forever.
  watchdog = setTimeout(() => {
    if (!first) return;
    showStartError(IN_APP
      ? "It looks like BirdGo is open inside another app, which can't ask for location. Open <b>r-boulanger.github.io/BirdGo</b> in Safari, Chrome or Edge instead."
      : "No location yet. If you didn't see a prompt, location may be turned off for your browser. " + HOW_TO_ALLOW);
  }, 12000);
  navigator.geolocation.getCurrentPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(onPos, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
}

$("#go").onclick = async () => {
  $("#startErr").hidden = true;
  if (!window.isSecureContext) { showStartError("Location only works on the secure address. Open <b>https://r-boulanger.github.io/BirdGo/</b>."); return; }
  if (!("geolocation" in navigator)) { showStartError("This browser can't share location. Try demo mode."); return; }
  $("#go").textContent = "Finding you…"; $("#go").disabled = true;
  try {
    const perm = await navigator.permissions?.query({ name: "geolocation" });
    if (perm && perm.state === "denied") { showStartError("Location is blocked for this site, so your browser won't ask again. " + HOW_TO_ALLOW + " Or try demo mode."); return; }
  } catch { /* some browsers can't report this; just ask */ }
  startTracking();
};
if (IN_APP) {
  $("#startErr").innerHTML = "Tip: for location to work, open BirdGo in Safari, Chrome or Edge rather than inside another app.";
  $("#startErr").hidden = false;
}

(async function boot() {
  const res = await fetch("data/birds-brunswick-me.json");
  birds = (await res.json()).birds;
  try { info = (await (await fetch("data/bird-info.json")).json()).info; } catch { /* pages show without extra info */ }
  initMap(); updateCount(); updateSeed();
  setInterval(() => { if (me) { renderStashes(); refreshConditions().then(() => tendSpawns()); } }, 60 * 1000);
})();

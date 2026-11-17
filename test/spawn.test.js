import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { birdWeight, spawnTable, pickSpawns, timeOfDay, weatherFromCode } from "../src/spawn.js";

const { birds } = JSON.parse(readFileSync(new URL("../data/birds-brunswick-me.json", import.meta.url)));
const by = id => birds.find(b => b.id === id);
const base = { month: 6, timeOfDay: "day", weather: "clear", cold: false, windy: false, habitats: ["town", "forest", "coast"] };

test("out-of-season birds never spawn", () => {
  assert.equal(birdWeight(by("snowy-owl"), base), 0);                                  // July: no Snowy Owls
  assert.equal(birdWeight(by("common-yellowthroat"), { ...base, month: 1 }), 0);         // January: no warblers
});

test("owls rule the night", () => {
  const top = spawnTable(birds, { ...base, month: 11, timeOfDay: "night", habitats: ["forest"] }).slice(0, 3).map(r => r.bird.group);
  assert.ok(top.includes("owl"), `top 3 at night: ${top}`);
});

test("rain brings out robins and keeps hummingbirds away", () => {
  const rain = { ...base, weather: "rain" };
  assert.ok(birdWeight(by("american-robin"), rain) > birdWeight(by("american-robin"), base));
  assert.ok(birdWeight(by("ruby-throated-hummingbird"), rain) < birdWeight(by("ruby-throated-hummingbird"), base) * 0.5);
});

test("habitat matters", () => {
  const coast = { ...base, month: 1, habitats: ["coast"] }, forest = { ...base, month: 1, habitats: ["forest"] };
  assert.ok(birdWeight(by("common-eider"), coast) > birdWeight(by("common-eider"), forest) * 5);
});

test("chances add up to 1 and picks are unique", () => {
  const t = spawnTable(birds, base);
  assert.ok(Math.abs(t.reduce((s, r) => s + r.chance, 0) - 1) < 1e-9);
  const picks = pickSpawns(birds, base, 8);
  assert.equal(new Set(picks.map(b => b.id)).size, 8);
});

test("time of day and weather codes", () => {
  assert.equal(timeOfDay(6.5, 6.4, 16.2), "dawn");
  assert.equal(timeOfDay(12, 6.4, 16.2), "day");
  assert.equal(timeOfDay(16, 6.4, 16.2), "dusk");
  assert.equal(timeOfDay(22, 6.4, 16.2), "night");
  assert.equal(weatherFromCode(0), "clear");
  assert.equal(weatherFromCode(61), "rain");
  assert.equal(weatherFromCode(73), "snow");
  assert.equal(weatherFromCode(95), "storm");
  assert.equal(weatherFromCode(45), "fog");
});

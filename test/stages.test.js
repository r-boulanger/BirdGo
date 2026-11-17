import { test } from "node:test";
import assert from "node:assert/strict";
import { addGrowth, stageOf, GROW, POINTS, stageSVG, mix } from "../src/stages.js";

test("a new bird starts as an infant", () => assert.equal(stageOf({ count: 1 }), "infant"));

test("growth moves infant -> adolescent -> adult and stops there", () => {
  const e = { stage: "infant", growth: 0 };
  let grew = null;
  for (let i = 0; i < GROW.infant / POINTS.feed; i++) grew = addGrowth(e, POINTS.feed) || grew;
  assert.equal(grew, "adolescent"); assert.equal(e.stage, "adolescent"); assert.equal(e.growth, 0);
  assert.equal(addGrowth(e, GROW.adolescent), "adult");
  assert.equal(addGrowth(e, 100), null); assert.equal(e.stage, "adult");
});

test("every stage draws for every bird", async () => {
  const { readFileSync } = await import("node:fs");
  const { birds } = JSON.parse(readFileSync(new URL("../data/birds-brunswick-me.json", import.meta.url)));
  for (const b of birds) for (const s of ["infant", "adolescent", "adult"]) assert.match(stageSVG(b, s), /^<svg[\s\S]*<\/svg>$/);
  assert.equal(mix("#000000", "#ffffff", .5), "#808080");
});

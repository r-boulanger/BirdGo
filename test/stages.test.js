import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stageOf, requirement, canEvolve, evolve, EVOLVE, stageSVG, mix } from "../src/stages.js";

const common = { rarity: "common" }, rare = { rarity: "rare" };

test("a new bird starts as an infant", () => assert.equal(stageOf({ count: 1 }), "infant"));

test("catches make it ready; seed pays for it", () => {
  const e = { stage: "infant", count: 2 };
  assert.equal(requirement(common, e).ready, false);
  assert.equal(canEvolve(common, e, 50), false, "not enough catches, even with lots of seed");
  e.count = EVOLVE.common.adolescent.catches;
  assert.equal(requirement(common, e).ready, true);
  assert.equal(canEvolve(common, e, 9), false, "ready but can't afford it");
  assert.deepEqual(evolve(common, e, 10), { stage: "adolescent", cost: 10 });
  assert.equal(e.stage, "adolescent");
});

test("adolescent to adult needs more catches and more seed, then stops", () => {
  const e = { stage: "adolescent", count: 7 };
  assert.equal(evolve(common, e, 50), null);
  e.count = 8;
  assert.equal(evolve(common, e, 24), null);
  assert.deepEqual(evolve(common, e, 25), { stage: "adult", cost: 25 });
  assert.equal(requirement(common, e), null);
  assert.equal(evolve(common, e, 50), null);
});

test("rare birds need fewer catches", () => {
  assert.ok(EVOLVE.rare.adult.catches < EVOLVE.common.adult.catches);
  assert.equal(requirement(rare, { stage: "adolescent", count: 3 }).ready, true);
});

test("every stage draws for every bird", () => {
  const { birds } = JSON.parse(readFileSync(new URL("../data/birds-brunswick-me.json", import.meta.url)));
  for (const b of birds) for (const s of ["infant", "adolescent", "adult"]) assert.match(stageSVG(b, s), /^<svg[\s\S]*<\/svg>$/);
  assert.equal(mix("#000000", "#ffffff", .5), "#808080");
});

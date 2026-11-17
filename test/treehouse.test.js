import { test } from "node:test";
import assert from "node:assert/strict";
import { TH, place, settleBackpack, fillBackpack, storeExtra, spendStash, hearts, feed, isHappy } from "../src/treehouse.js";

const fresh = () => ({ at: null, stash: 0, fed: {} });

test("first tree house is free, moving costs seed from the backpack", () => {
  const h = fresh(), seed = { bag: 10 };
  assert.deepEqual(place(h, seed, [1, 2]), { ok: true, cost: 0 });
  assert.equal(place(h, seed, [3, 4]).ok, false, "10 pouches isn't enough to move");
  seed.bag = 20;
  assert.deepEqual(place(h, seed, [3, 4]), { ok: true, cost: TH.moveCost });
  assert.equal(seed.bag, 20 - TH.moveCost); assert.deepEqual(h.at, [3, 4]);
});

test("backpack holds a limited amount; the rest lives in the stash", () => {
  const h = fresh(), seed = { bag: 47 };
  settleBackpack(h, seed);
  assert.equal(seed.bag, TH.backpackMax); assert.equal(h.stash, 47 - TH.backpackMax);
  seed.bag = 5;
  assert.equal(fillBackpack(h, seed), 15); assert.equal(seed.bag, 20); assert.equal(h.stash, 12);
  assert.equal(storeExtra(h, seed), 20); assert.equal(seed.bag, 0); assert.equal(h.stash, 32);
  assert.equal(spendStash(h, 40), false); assert.equal(spendStash(h, 30), true); assert.equal(h.stash, 2);
});

test("feeding fills hearts that empty over time", () => {
  const h = { ...fresh(), stash: 5 }, t = 1e12;
  assert.equal(hearts(h, "x", t), 0);
  feed(h, "x", t); feed(h, "x", t); feed(h, "x", t);
  assert.equal(hearts(h, "x", t), 3); assert.ok(isHappy(h, "x", t)); assert.equal(h.stash, 2);
  assert.equal(feed(h, "x", t), null, "can't overfeed");
  assert.equal(hearts(h, "x", t + TH.heartMs), 2);
  assert.equal(hearts(h, "x", t + TH.heartMs * 5), 0);
  h.stash = 0; assert.equal(feed(h, "x", t + TH.heartMs), null, "no seed, no food");
});

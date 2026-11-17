import { test } from "node:test";
import assert from "node:assert/strict";
import { stashesNear, collect, spend, isReady, SEED } from "../src/seed.js";

const dist = (a, b) => Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(a[0] * Math.PI / 180));
const BRUNSWICK = [43.9145, -69.9653];

test("stashes stay in the same place as you walk", () => {
  const a = stashesNear(...BRUNSWICK);
  const b = stashesNear(BRUNSWICK[0] + .001, BRUNSWICK[1] + .001);
  const shared = a.filter(s => b.some(t => t.id === s.id));
  assert.ok(shared.length > 0);
  for (const s of shared) assert.deepEqual(s.at, b.find(t => t.id === s.id).at);
});

test("there is usually a stash within a short walk", () => {
  for (let i = 0; i < 30; i++) {
    const p = [BRUNSWICK[0] + (i % 6) * .0013, BRUNSWICK[1] + Math.floor(i / 6) * .0017];
    const near = Math.min(...stashesNear(...p).map(s => dist(p, s.at)));
    assert.ok(near < 260, `nearest stash ${Math.round(near)} m away`);
  }
});

test("stashes are spread out, not stacked", () => {
  const s = stashesNear(...BRUNSWICK);
  for (const a of s) for (const b of s) if (a !== b) assert.ok(dist(a.at, b.at) > 50);
});

test("collecting fills the bag, empties the stash, and it refills later", () => {
  const st = { bag: 10, used: {} }, stash = { id: "x", at: BRUNSWICK, amount: 5 }, t = 1e12;
  assert.equal(collect(st, stash, t), 5); assert.equal(st.bag, 15);
  assert.equal(collect(st, stash, t + 1000), 0);
  assert.ok(isReady(st, stash, t + SEED.refillMs));
  assert.equal(collect(st, stash, t + SEED.refillMs), 5);
});

test("the bag never overflows or goes negative", () => {
  const st = { bag: SEED.maxBag - 2, used: {} };
  assert.equal(collect(st, { id: "y", amount: 7 }, 1), 2); assert.equal(st.bag, SEED.maxBag);
  st.bag = 1; spend(st); spend(st); assert.equal(st.bag, 0);
});

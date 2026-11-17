import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, nameProblem, setName, NAME_COST, NAME_MAX } from "../src/naming.js";

test("names are tidied", () => {
  assert.equal(cleanName("  Sir   Peeps  "), "Sir Peeps");
  assert.equal(cleanName("<b>Pip</b>"), "bPip/b");
  assert.equal(cleanName("x".repeat(40)).length, NAME_MAX);
});

test("naming costs seed pouches", () => {
  const e = { count: 1 };
  assert.match(nameProblem(e, "Pip", NAME_COST - 1), /costs/);
  assert.equal(setName(e, "Pip", NAME_COST - 1), null);
  assert.deepEqual(setName(e, "Pip", NAME_COST), { name: "Pip", cost: NAME_COST });
  assert.equal(e.nickname, "Pip");
  assert.match(nameProblem(e, "Pip", 50), /already/);
  assert.match(nameProblem(e, "   ", 50), /Type a name/);
  assert.deepEqual(setName(e, "Pippa", 50), { name: "Pippa", cost: NAME_COST });
});

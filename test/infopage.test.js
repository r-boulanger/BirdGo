import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { whereWhen, wikiTitle, links } from "../src/infopage.js";

const { birds } = JSON.parse(readFileSync(new URL("../data/birds-brunswick-me.json", import.meta.url)));
const { info } = JSON.parse(readFileSync(new URL("../data/bird-info.json", import.meta.url)));
const by = id => birds.find(b => b.id === id);

test("every bird has an info entry with the basics", () => {
  for (const b of birds) {
    const i = info[b.id];
    assert.ok(i, `missing info for ${b.id}`);
    for (const k of ["ebird", "length", "wingspan", "weight", "diet", "nest", "voice"]) assert.ok(i[k], `${b.id} missing ${k}`);
    assert.ok(i.facts.length >= 1, `${b.id} needs a fun fact`);
  }
});

test("links are built from the bird's name", () => {
  assert.equal(wikiTitle("Black-capped Chickadee"), "Black-capped_chickadee");
  assert.equal(wikiTitle("American Black Duck"), "American_black_duck");
  const l = links(by("black-capped-chickadee"), info["black-capped-chickadee"]);
  assert.equal(l.aab, "https://www.allaboutbirds.org/guide/Black-capped_Chickadee");
  assert.equal(l.ebird, "https://ebird.org/species/bkcchi");
});

test("where & when reads naturally", () => {
  assert.match(whereWhen(by("black-capped-chickadee")), /^Here all year · found in woods and in town/);
  assert.match(whereWhen(by("osprey")), /^Here April to October/);
  assert.match(whereWhen(by("snowy-owl")), /^Here December to March/);
  assert.match(whereWhen(by("semipalmated-sandpiper")), /^Here May and July to September/);
});

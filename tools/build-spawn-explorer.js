// Builds docs/design/spawn-explorer.html from the template, the bird data and src/spawn.js,
// so the explorer always uses the same rules as the game.
import { readFileSync, writeFileSync } from "node:fs";
const r = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const data = JSON.stringify(JSON.parse(r("data/birds-brunswick-me.json")));
const spawn = r("src/spawn.js").replace(/^export /gm, "");
const html = r("docs/design/spawn-explorer.template.html").replace("/*DATA*/", () => data).replace("/*SPAWN*/", () => spawn);
writeFileSync(new URL("../docs/design/spawn-explorer.html", import.meta.url), html);
console.log("Built docs/design/spawn-explorer.html");

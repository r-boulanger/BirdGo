// What's around the player, from OpenStreetMap (Overpass API, free, no key).
// Returns a list of BirdGo habitats: town, forest, field, marsh, freshwater, coast.
const OVERPASS = "https://overpass-api.de/api/interpreter";

export async function nearbyHabitats(lat, lon, radius = 400) {
  const a = `(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})`;
  const q = `[out:json][timeout:12];(
    way${a}["natural"="water"];relation${a}["natural"="water"];way${a}["waterway"~"river|stream|canal"];
    way${a}["natural"~"wood|scrub"];way${a}["landuse"="forest"];
    way${a}["landuse"~"meadow|farmland|grass|recreation_ground"];way${a}["leisure"~"park|golf_course|pitch"];
    way${a}["natural"="wetland"];
    way${a}["natural"~"coastline|beach|bay"];
    way${a}["building"];
  );out tags 400;`;
  const res = await fetch(OVERPASS, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!res.ok) throw new Error("Map data lookup failed");
  const { elements = [] } = await res.json();
  const found = new Set();
  let buildings = 0;
  for (const { tags = {} } of elements) {
    if (tags.building) buildings++;
    if (tags.natural === "water" || tags.waterway) found.add(tags.water === "lagoon" ? "coast" : "freshwater");
    if (/wood|scrub/.test(tags.natural || "") || tags.landuse === "forest") found.add("forest");
    if (/meadow|farmland|grass|recreation_ground/.test(tags.landuse || "") || /park|golf_course|pitch/.test(tags.leisure || "")) found.add("field");
    if (tags.natural === "wetland") found.add(tags.wetland === "saltmarsh" ? "coast" : "marsh"), found.add("marsh");
    if (/coastline|beach|bay/.test(tags.natural || "")) found.add("coast");
  }
  if (buildings >= 8) found.add("town");
  if (!found.size) found.add("town");
  return [...found];
}

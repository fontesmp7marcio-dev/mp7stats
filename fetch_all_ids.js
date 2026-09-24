import fs from 'fs';

const text = fs.readFileSync('all_players.txt', 'utf8');
const names = text.split('\n').filter(Boolean).map(n => n.trim());

async function getSofascoreId(name) {
  // simplify name for search
  const queryName = name.replace(/ /g, ' ').toLowerCase();
  const sparql = `
    SELECT ?sofascoreId WHERE {
      ?item wdt:P7353 ?sofascoreId .
      ?item rdfs:label ?itemLabel .
      FILTER(LCASE(?itemLabel) = "${queryName}")
      FILTER(LANG(?itemLabel) = "en")
    } LIMIT 1
  `;
  const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparql);
  try {
    const res = await fetch(url, { headers: { "Accept": "application/sparql-results+json", "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    if (data.results.bindings.length > 0) {
      return data.results.bindings[0].sofascoreId.value;
    }
    
    // Fallback: Contains search
    const sparqlContains = `
      SELECT ?sofascoreId WHERE {
        ?item wdt:P7353 ?sofascoreId .
        ?item rdfs:label ?itemLabel .
        FILTER(CONTAINS(LCASE(?itemLabel), "${queryName}"))
        FILTER(LANG(?itemLabel) = "en")
      } LIMIT 1
    `;
    const url2 = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(sparqlContains);
    const res2 = await fetch(url2, { headers: { "Accept": "application/sparql-results+json", "User-Agent": "Mozilla/5.0" } });
    const data2 = await res2.json();
    if (data2.results.bindings.length > 0) {
      return data2.results.bindings[0].sofascoreId.value;
    }
  } catch(e) {}
  return null;
}

async function run() {
  const map = {};
  for (const name of names) {
    const id = await getSofascoreId(name);
    if (id) {
      map[name] = id;
      console.log(`Found ${name} -> ${id}`);
    } else {
      console.log(`Not found ${name}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
  fs.writeFileSync('id_map.json', JSON.stringify(map, null, 2));
}

run();

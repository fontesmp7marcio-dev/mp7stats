import urllib.request
import urllib.parse
import json
import time

players = [
    "Alex Remiro", "Takefusa Kubo", "Mikel Oyarzabal", "Brais Mendez", "Martin Zubimendi", "Sergio Gomez",
    "Kepa Arrizabalaga", "Antoine Semenyo", "Evanilson", "Marcus Tavernier", "Lewis Cook", "Justin Kluivert",
    "Lukáš Hrádecký", "Florian Wirtz", "Victor Boniface", "Jeremie Frimpong", "Granit Xhaka",
    "Timon Wellenreuther", "Santiago Giménez", "Igor Paixão", "Quinten Timber", "Calvin Stengs",
    "David Raya", "Bukayo Saka", "Kai Havertz", "Martin Ødegaard", "Declan Rice",
    "Marco Carnesecchi", "Mateo Retegui", "Charles De Ketelaere", "Ademola Lookman", "Ederson",
    "Vinícius Júnior", "Jude Bellingham", "Kylian Mbappé", "Harry Kane", "Jamal Musiala", "Pedro"
]

results = {}

for name in players:
    # Use Wikidata search
    query = f"""
    SELECT ?item ?sofascoreId WHERE {{
      ?item wdt:P7353 ?sofascoreId .
      ?item rdfs:label ?itemLabel .
      FILTER(CONTAINS(LCASE(?itemLabel), "{name.lower()}"))
      FILTER(LANG(?itemLabel) = "en")
    }} LIMIT 1
    """
    url = "https://query.wikidata.org/sparql?query=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"Accept": "application/sparql-results+json", "User-Agent": "Mozilla/5.0"})
    try:
        html = urllib.request.urlopen(req).read().decode("utf-8")
        data = json.loads(html)
        bindings = data.get("results", {}).get("bindings", [])
        if bindings:
            results[name] = bindings[0]["sofascoreId"]["value"]
            print(f'"{name}": "{bindings[0]["sofascoreId"]["value"]}",')
    except Exception as e:
        pass
    time.sleep(0.2)

print(json.dumps(results))

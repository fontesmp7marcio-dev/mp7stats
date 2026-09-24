import urllib.request
import re
import urllib.parse
import time
import json

players = {
    "Álex Remiro": "Alex Remiro Sofascore",
    "Takefusa Kubo": "Takefusa Kubo Sofascore",
    "Mikel Oyarzabal": "Mikel Oyarzabal Sofascore",
    "Brais Méndez": "Brais Mendez Sofascore",
    "Martín Zubimendi": "Martin Zubimendi Sofascore",
    "Sergio Gómez": "Sergio Gomez Sofascore",
    "Kepa Arrizabalaga": "Kepa Arrizabalaga Sofascore",
    "Antoine Semenyo": "Antoine Semenyo Sofascore",
    "Evanilson": "Evanilson Sofascore",
    "Marcus Tavernier": "Marcus Tavernier Sofascore",
    "Lewis Cook": "Lewis Cook Sofascore",
    "Justin Kluivert": "Justin Kluivert Sofascore",
}

results = {}
for name, query in players.items():
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        html = urllib.request.urlopen(req).read().decode("utf-8")
        urls = re.findall(r"uddg=([^&]+)", html)
        for u in urls:
            decoded = urllib.parse.unquote(u)
            match = re.search(r"sofascore\.com/.*/player/[^/]+/(\d+)", decoded)
            if not match:
                match = re.search(r"sofascore\.com/player/[^/]+/(\d+)", decoded)
            if match:
                results[name] = match.group(1)
                print(f'"{name}": "{match.group(1)}",')
                break
    except Exception as e:
        print(f"Error {name}: {e}")
    time.sleep(0.5)

print(json.dumps(results))

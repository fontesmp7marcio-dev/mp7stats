import urllib.request
import re
import urllib.parse
import time

players = {
    "Vinícius Júnior": "Vinicius Junior Sofascore",
    "Jude Bellingham": "Jude Bellingham Sofascore",
    "Kylian Mbappé": "Kylian Mbappe Sofascore",
    "Rodrygo": "Rodrygo Sofascore",
    "Federico Valverde": "Federico Valverde Sofascore",
    "Harry Kane": "Harry Kane Sofascore",
    "Jamal Musiala": "Jamal Musiala Sofascore",
    "Leroy Sané": "Leroy Sane Sofascore",
    "Thomas Müller": "Thomas Muller Sofascore",
    "Pedro": "Pedro Flamengo Sofascore",
    "Endrick": "Endrick Palmeiras Sofascore",
    "Raphael Veiga": "Raphael Veiga Sofascore",
    "Giorgian De Arrascaeta": "Arrascaeta Sofascore",
    "Lamine Yamal": "Lamine Yamal Sofascore",
    "Robert Lewandowski": "Lewandowski Sofascore",
    "Raphinha": "Raphinha Sofascore"
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
        pass
    time.sleep(0.5)

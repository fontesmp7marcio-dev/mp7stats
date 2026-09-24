import urllib.request
import re
import urllib.parse
req = urllib.request.Request("https://html.duckduckgo.com/html/?q=site:sofascore.com+%22Karim+Konate%22", headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req).read().decode("utf-8")
urls = re.findall(r"uddg=([^&]+)", html)
for u in urls:
    print(urllib.parse.unquote(u))

const fs = require('fs');

async function run() {
  const teams = [
    "Manchester City", "Liverpool", "Chelsea", "Manchester United", "Tottenham", "Aston Villa",
    "Real Madrid", "Atletico Madrid", "Juventus", "Napoli", "Inter", "AC Milan", "Bayern Munich", "Borussia Dortmund",
    "Flamengo", "Palmeiras", "Sao Paulo", "Botafogo"
  ];
  const map = {};
  for (const team of teams) {
    try {
      console.log("Fetching", team);
      const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=${encodeURIComponent(team)}`);
      const data = await res.json();
      if (data && data.player && data.player.length > 0) {
        map[team] = data.player.slice(0, 8).map(p => ({
          name: p.strPlayer,
          shortName: p.strPlayer.split(' ').slice(-1)[0],
          photoUrl: p.strCutout || p.strThumb || "",
          position: p.strPosition
        }));
      }
    } catch(e) { console.log("Error", team) }
    await new Promise(r => setTimeout(r, 500));
  }
  fs.writeFileSync('teams_scraped.json', JSON.stringify(map, null, 2));
}
run();

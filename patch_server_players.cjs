const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const playerProxy = `
  app.get("/api/roster", async (req, res) => {
    const team = req.query.team as string;
    if (!team) return res.json({ success: false, players: [] });
    try {
      const response = await fetch(\`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?t=\${encodeURIComponent(team)}\`);
      if (response.ok) {
        const data = await response.json();
        const players = data.player || [];
        const mapped = players.slice(0, 10).map((p: any) => ({
          name: p.strPlayer,
          shortName: p.strPlayer.split(' ').slice(-1)[0],
          photoUrl: p.strCutout || p.strThumb || "",
          position: p.strPosition || "Jogador",
          jerseyNumber: parseInt(p.strNumber) || Math.floor(Math.random()*99)+1
        }));
        return res.json({ success: true, players: mapped });
      }
    } catch (e) {
      console.warn("Error fetching players for", team, e);
    }
    res.json({ success: false, players: [] });
  });
`;

code = code.replace('  // Auditoria Direta de URL do StatsHUB', playerProxy + '\n  // Auditoria Direta de URL do StatsHUB');
fs.writeFileSync('server.ts', code);
console.log("Added /api/roster");

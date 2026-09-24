const fs = require('fs');
let code = fs.readFileSync('src/components/StatsHubPlayerTrendsView.tsx', 'utf8');

const injectHooks = `
  const [asyncPlayers, setAsyncPlayers] = useState<{allPlayers: RealPlayerProfile[], homePlayers: RealPlayerProfile[], awayPlayers: RealPlayerProfile[]} | null>(null);

  useEffect(() => {
    const defaultData = getPlayersForCurrentMatch(match);
    let needsHome = defaultData.homePlayers.some(p => p.shortName === "Goleiro" || p.shortName === "Atacante");
    let needsAway = defaultData.awayPlayers.some(p => p.shortName === "Goleiro" || p.shortName === "Atacante");

    if (!needsHome && !needsAway) {
      setAsyncPlayers(defaultData);
      return;
    }

    async function fetchPlayers() {
      let homeP = defaultData.homePlayers;
      let awayP = defaultData.awayPlayers;

      const genericOpponents = [
        { shortName: "ADV", fullName: "Adversário 1", score: "2-1", isHome: true, minutes: 90, subStatus: "90'", color: "#4f2d7f" },
        { shortName: "RIV", fullName: "Rival Local", score: "1-0", isHome: false, minutes: 90, subStatus: "90'", color: "#00874e" },
        { shortName: "EXT", fullName: "Adversário Fora", score: "2-2", isHome: false, minutes: 90, subStatus: "90'", color: "#0055a5" },
        { shortName: "CLA", fullName: "Clássico", score: "2-1", isHome: false, minutes: 90, subStatus: "90'", color: "#ee2524" }
      ];

      const makeFakeMarkets = (isGk: boolean) => {
        const obj: any = {};
        if (isGk) {
          obj["Defesas de goleiro"] = { avg: 3.8, defaultLine: 2.5, odds: 1.48, values10: [4, 3, 5, 2, 6, 4, 3, 5, 4, 3] };
          obj["Cartões"] = { avg: 0.1, defaultLine: 0.5, odds: 6.00, values10: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] };
        } else {
          obj["Chutes no gol"] = { avg: 1.9, defaultLine: 1.5, odds: 1.40, values10: [2, 2, 3, 1, 2, 2, 3, 2, 2, 1] };
          obj["Finalizações"] = { avg: 3.6, defaultLine: 2.5, odds: 1.30, values10: [4, 3, 5, 3, 4, 3, 4, 3, 4, 3] };
          obj["Gols"] = { avg: 0.6, defaultLine: 0.5, odds: 2.35, values10: [1, 1, 0, 1, 0, 1, 0, 1, 1, 0] };
          obj["Faltas sofridas"] = { avg: 2.2, defaultLine: 1.5, odds: 1.48, values10: [2, 3, 2, 2, 3, 1, 3, 2, 2, 2] };
          obj["Desarmes"] = { avg: 2.1, defaultLine: 1.5, odds: 1.5, values10: [2, 1, 3, 2, 2, 1, 3, 2, 1, 2] };
        }
        return obj;
      };

      if (needsHome) {
        try {
          const res = await fetch(\`/api/roster?team=\${encodeURIComponent(match.homeTeam)}\`);
          const data = await res.json();
          if (data.success && data.players.length > 0) {
            homeP = data.players.map((p: any, i: number) => ({
              id: \`home-\${i}\`,
              name: p.name,
              shortName: p.shortName,
              photoUrl: p.photoUrl || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(p.shortName)}&background=random&color=fff&size=128\`,
              team: match.homeTeam,
              teamSide: "home",
              position: p.position,
              jerseyNumber: p.jerseyNumber,
              isGoalkeeper: p.position === "Goalkeeper",
              avatarColor: "#004d98",
              topMarkets: p.position === "Goalkeeper" ? ["Defesas de goleiro", "Cartões"] : ["Chutes no gol", "Finalizações", "Gols", "Desarmes"],
              markets: makeFakeMarkets(p.position === "Goalkeeper"),
              opponents10: genericOpponents
            }));
          }
        } catch (e) {}
      }

      if (needsAway) {
        try {
          const res = await fetch(\`/api/roster?team=\${encodeURIComponent(match.awayTeam)}\`);
          const data = await res.json();
          if (data.success && data.players.length > 0) {
            awayP = data.players.map((p: any, i: number) => ({
              id: \`away-\${i}\`,
              name: p.name,
              shortName: p.shortName,
              photoUrl: p.photoUrl || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(p.shortName)}&background=random&color=fff&size=128\`,
              team: match.awayTeam,
              teamSide: "away",
              position: p.position,
              jerseyNumber: p.jerseyNumber,
              isGoalkeeper: p.position === "Goalkeeper",
              avatarColor: "#d92027",
              topMarkets: p.position === "Goalkeeper" ? ["Defesas de goleiro", "Cartões"] : ["Chutes no gol", "Finalizações", "Gols", "Desarmes"],
              markets: makeFakeMarkets(p.position === "Goalkeeper"),
              opponents10: genericOpponents
            }));
          }
        } catch (e) {}
      }

      setAsyncPlayers({ allPlayers: [...homeP, ...awayP], homePlayers: homeP, awayPlayers: awayP });
    }
    fetchPlayers();
  }, [match]);

  const { allPlayers, homePlayers, awayPlayers } = asyncPlayers || getPlayersForCurrentMatch(match);
`;

code = code.replace(
  '  const { allPlayers, homePlayers, awayPlayers } = useMemo(() => getPlayersForCurrentMatch(match), [match]);',
  injectHooks
);

fs.writeFileSync('src/components/StatsHubPlayerTrendsView.tsx', code);
console.log("Patched StatsHubPlayerTrendsView.tsx");

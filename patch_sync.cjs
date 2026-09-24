const fs = require('fs');
let code = fs.readFileSync('src/server/statshubSync.ts', 'utf8');

const perfFn = `
async function fetchTeamPerformanceSafe(teamId: number): Promise<any[]> {
  try {
    const res = await fetch(\`https://www.statshub.com/api/team/\${teamId}/performance\`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (e) {
    console.warn("Error fetching team performance", teamId, e.message);
  }
  return [];
}
`;

// Inject perfFn before fetchStatsHubMatches
code = code.replace('export async function fetchStatsHubMatches', perfFn + '\nexport async function fetchStatsHubMatches');

// Find the loop:
// const mappedMatches: MatchData[] = flattenedRaw.map((raw, idx) => { ... })
// We need to change this map to an async map, or pre-fetch the team data before the map.
// Let's pre-fetch the data for the first N matches.

const prefetchLogic = `
        // PRE-FETCH REAL DATA FOR TOP 30 MATCHES (TO AVOID INVENTING DATA)
        const teamPerfCache = new Map<number, any[]>();
        const fetchPromises: Promise<void>[] = [];
        const matchesToFetch = flattenedRaw.slice(0, 30);
        
        for (const raw of matchesToFetch) {
          const hid = raw.homeTeam?.id;
          const aid = raw.awayTeam?.id;
          if (hid && !teamPerfCache.has(hid)) {
            teamPerfCache.set(hid, []); // mark as fetching
            fetchPromises.push(fetchTeamPerformanceSafe(hid).then(d => { teamPerfCache.set(hid, d); }));
          }
          if (aid && !teamPerfCache.has(aid)) {
            teamPerfCache.set(aid, []);
            fetchPromises.push(fetchTeamPerformanceSafe(aid).then(d => { teamPerfCache.set(aid, d); }));
          }
        }
        
        console.log(\`[StatsHUB Sync] Buscando histórico real de \${fetchPromises.length} equipes para os top 30 jogos...\`);
        await Promise.all(fetchPromises);
        console.log(\`[StatsHUB Sync] Histórico real baixado com sucesso.\`);
        
        const mappedMatches: MatchData[] = flattenedRaw.map((raw, idx) => {
`;

code = code.replace('        const mappedMatches: MatchData[] = flattenedRaw.map((raw, idx) => {', prefetchLogic);

const matchObjCall = `
          const realHome = teamPerfCache.has(raw.homeTeam?.id) ? { id: raw.homeTeam?.id, data: teamPerfCache.get(raw.homeTeam?.id)! } : undefined;
          const realAway = teamPerfCache.has(raw.awayTeam?.id) ? { id: raw.awayTeam?.id, data: teamPerfCache.get(raw.awayTeam?.id)! } : undefined;

          const matchObj = buildMatchObject(
            \`sh-\${evt.id || idx}\`,
            dateStr,
            matchTime,
            homeTeam,
            awayTeam,
            league,
            rand,
            forcedStatus,
            forcedScore,
            officialStatshubUrl,
            realHome,
            realAway
          );
`;

code = code.replace(/          const matchObj = buildMatchObject\([\s\S]*?\);/, matchObjCall);

fs.writeFileSync('src/server/statshubSync.ts', code);
console.log("Patched statshubSync.ts");

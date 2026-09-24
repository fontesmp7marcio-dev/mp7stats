/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { findRosterInExtendedDatabase } from "../teamRostersDatabase";
import { OFFICIAL_TEAM_ROSTERS } from "../playerTrendsData";

export interface TeamOpponent {
  shortName: string;
  fullName: string;
  score: string;
  isHome: boolean;
  minutes: number;
  subStatus: string;
  color: string;
  opponentTeamId?: number;
  competition?: string;
  date?: string;
  eventId?: number;
  statValuesByMarket?: Record<string, number>;
}

export interface MarketHistoryDef {
  avg: number;
  defaultLine: number;
  odds: number;
  values10: number[];
  recordText?: string;
  hitRatePercent?: number;
  per90?: number;
  med?: number;
}

export interface RealPlayerProfile {
  id: string;
  name: string;
  shortName: string;
  team: string;
  teamSide: "home" | "away";
  position: string;
  jerseyNumber: number;
  isGoalkeeper?: boolean;
  avatarColor: string;
  photoUrl?: string;
  statshubId?: string;
  inPredictedLineup?: boolean;
  topMarkets: string[];
  markets: {
    [marketName: string]: MarketHistoryDef;
  };
  opponents10: TeamOpponent[];
}

// Mapeamento dos mercados oficiais do StatsHUB para os rótulos em português
export const STATSHUB_STAT_TYPE_TO_MARKET: Record<string, string> = {
  shots: "Finalizações",
  onTargetScoringAttempt: "Chutes no gol",
  fouls: "Faltas cometidas",
  wasFouled: "Faltas sofridas",
  totalTackle: "Desarmes",
  totalPass: "Passes",
  cards: "Cartões",
  yellowCard: "Cartões",
  yellowCards: "Cartões",
  goalAssist: "Assistências",
  assists: "Assistências",
  saves: "Defesas de goleiro",
  goalkeeperSaves: "Defesas de goleiro",
  scoredOrAssisted: "Gols",
  goals: "Gols"
};

// Cores determinísticas para badges de adversários com bom contraste
const TEAM_COLOR_PALETTE = [
  "#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed",
  "#0284c7", "#ea580c", "#475569", "#059669", "#be185d"
];

function getOpponentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEAM_COLOR_PALETTE.length;
  return TEAM_COLOR_PALETTE[index];
}

// Cache em memória por partida
const fixturePlayerTrendsCache = new Map<string, { timestamp: number; data: RealPlayerProfile[] }>();
const inFlightRequests = new Map<string, Promise<RealPlayerProfile[]>>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Constrói os mercados e históricos individuais de um jogador a partir de suas performances reais
 */
function buildMarketsFromAppearances(
  appearances: Array<{ stat: any; opponent: TeamOpponent; isGk: boolean }>
): { markets: Record<string, MarketHistoryDef>; topMarkets: string[] } {
  const markets: Record<string, MarketHistoryDef> = {};
  const topMarkets: string[] = [];
  const validCount = appearances.length;
  if (validCount === 0) return { markets, topMarkets };

  // 1. Chutes no gol (onTargetScoringAttempt)
  const sotVals = appearances.map(a => Number(a.stat.onTargetScoringAttempt || 0));
  const sotHits = sotVals.filter(v => v >= 0.5).length;
  const sotAvg = Number((sotVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Chutes no gol"] = {
    avg: sotAvg,
    defaultLine: 0.5,
    odds: 1.45,
    values10: sotVals,
    recordText: `${sotHits}/${validCount}`,
    hitRatePercent: Math.round((sotHits / validCount) * 100),
    per90: sotAvg,
    med: sotAvg >= 1 ? 1.0 : 0.0
  };
  if (sotAvg >= 0.5) topMarkets.push("Chutes no gol");

  // 2. Finalizações totais (shots)
  const shotsVals = appearances.map(a => {
    const s = a.stat;
    if (typeof s.shots === "number") return s.shots;
    return Number((s.onTargetScoringAttempt || 0) + (s.shotOffTarget || 0) + (s.blockedScoringAttempt || 0));
  });
  const shotsHits = shotsVals.filter(v => v >= 1.5).length;
  const shotsAvg = Number((shotsVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Finalizações"] = {
    avg: shotsAvg,
    defaultLine: 1.5,
    odds: 1.55,
    values10: shotsVals,
    recordText: `${shotsHits}/${validCount}`,
    hitRatePercent: Math.round((shotsHits / validCount) * 100),
    per90: shotsAvg,
    med: shotsAvg >= 2 ? 2.0 : 1.0
  };
  if (shotsAvg >= 1.5) topMarkets.push("Finalizações");

  // 3. Desarmes (totalTackle)
  const tackleVals = appearances.map(a => Number(a.stat.totalTackle || 0));
  const tackleHits = tackleVals.filter(v => v >= 1.5).length;
  const tackleAvg = Number((tackleVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Desarmes"] = {
    avg: tackleAvg,
    defaultLine: 1.5,
    odds: 1.48,
    values10: tackleVals,
    recordText: `${tackleHits}/${validCount}`,
    hitRatePercent: Math.round((tackleHits / validCount) * 100),
    per90: tackleAvg,
    med: tackleAvg >= 1 ? 1.0 : 0.0
  };
  if (tackleAvg >= 1.5) topMarkets.push("Desarmes");

  // 4. Faltas cometidas (fouls)
  const foulsVals = appearances.map(a => Number(a.stat.fouls || 0));
  const foulsHits = foulsVals.filter(v => v >= 1.5).length;
  const foulsAvg = Number((foulsVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Faltas cometidas"] = {
    avg: foulsAvg,
    defaultLine: 1.5,
    odds: 1.50,
    values10: foulsVals,
    recordText: `${foulsHits}/${validCount}`,
    hitRatePercent: Math.round((foulsHits / validCount) * 100),
    per90: foulsAvg,
    med: foulsAvg >= 1 ? 1.0 : 0.0
  };
  if (foulsAvg >= 1.0) topMarkets.push("Faltas cometidas");

  // 5. Faltas sofridas (wasFouled)
  const wasFouledVals = appearances.map(a => Number(a.stat.wasFouled || 0));
  const wasFouledHits = wasFouledVals.filter(v => v >= 1.5).length;
  const wasFouledAvg = Number((wasFouledVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Faltas sofridas"] = {
    avg: wasFouledAvg,
    defaultLine: 1.5,
    odds: 1.52,
    values10: wasFouledVals,
    recordText: `${wasFouledHits}/${validCount}`,
    hitRatePercent: Math.round((wasFouledHits / validCount) * 100),
    per90: wasFouledAvg,
    med: wasFouledAvg >= 1 ? 1.0 : 0.0
  };
  if (wasFouledAvg >= 1.0) topMarkets.push("Faltas sofridas");

  // 6. Cartões amarelos (yellowCard estritamente)
  const yellowCardVals = appearances.map(a => {
    const yc = a.stat.yellowCard;
    if (yc === null || yc === undefined) return 0;
    return Number(yc) > 0 ? Number(yc) : 0;
  });
  const yellowCardHits = yellowCardVals.filter(v => v >= 0.5).length;
  const yellowCardAvg = Number((yellowCardVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Cartões"] = {
    avg: yellowCardAvg,
    defaultLine: 0.5,
    odds: 3.40,
    values10: yellowCardVals,
    recordText: `${yellowCardHits}/${validCount}`,
    hitRatePercent: Math.round((yellowCardHits / validCount) * 100),
    per90: yellowCardAvg,
    med: 0.0
  };
  if (yellowCardHits >= 2) topMarkets.push("Cartões");

  // 7. Assistências (goalAssist estritamente)
  const assistVals = appearances.map(a => Number(a.stat.goalAssist || 0));
  const assistHits = assistVals.filter(v => v >= 0.5).length;
  const assistAvg = Number((assistVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Assistências"] = {
    avg: assistAvg,
    defaultLine: 0.5,
    odds: 3.20,
    values10: assistVals,
    recordText: `${assistHits}/${validCount}`,
    hitRatePercent: Math.round((assistHits / validCount) * 100),
    per90: assistAvg,
    med: 0.0
  };
  if (assistHits >= 1) topMarkets.push("Assistências");

  // 8. Gols / Marcar a qualquer momento (goals estritamente)
  const goalVals = appearances.map(a => Number(a.stat.goals || 0));
  const goalHits = goalVals.filter(v => v >= 0.5).length;
  const goalAvg = Number((goalVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Gols"] = {
    avg: goalAvg,
    defaultLine: 0.5,
    odds: 2.80,
    values10: goalVals,
    recordText: `${goalHits}/${validCount}`,
    hitRatePercent: Math.round((goalHits / validCount) * 100),
    per90: goalAvg,
    med: 0.0
  };
  if (goalHits >= 1) topMarkets.push("Gols");

  // 9. Passes (totalPass)
  const passVals = appearances.map(a => Number(a.stat.totalPass || 0));
  const passAvg = Number((passVals.reduce((a, b) => a + b, 0) / validCount).toFixed(1));
  const passLine = passAvg >= 50 ? 45.5 : (passAvg >= 30 ? 25.5 : 0.5);
  const passHits = passVals.filter(v => v >= passLine).length;
  markets["Passes"] = {
    avg: passAvg,
    defaultLine: passLine,
    odds: 1.83,
    values10: passVals,
    recordText: `${passHits}/${validCount}`,
    hitRatePercent: Math.round((passHits / validCount) * 100),
    per90: passAvg,
    med: passAvg
  };

  // 10. Defesas de goleiro (saves - computado para todos, exibido para goleiros)
  const saveVals = appearances.map(a => Number(a.stat.saves || 0));
  const saveHits = saveVals.filter(v => v >= 2.5).length;
  const saveAvg = Number((saveVals.reduce((a, b) => a + b, 0) / validCount).toFixed(2));
  markets["Defesas de goleiro"] = {
    avg: saveAvg,
    defaultLine: 2.5,
    odds: 1.70,
    values10: saveVals,
    recordText: `${saveHits}/${validCount}`,
    hitRatePercent: Math.round((saveHits / validCount) * 100),
    per90: saveAvg,
    med: saveAvg >= 2 ? 2.0 : 1.0
  };
  if (appearances[0]?.isGk) {
    topMarkets.unshift("Defesas de goleiro");
  }

  // Preencher statValuesByMarket em cada objeto de adversário
  appearances.forEach((app, idx) => {
    app.opponent.statValuesByMarket = {
      "Chutes no gol": sotVals[idx] ?? 0,
      "Finalizações": shotsVals[idx] ?? 0,
      "Desarmes": tackleVals[idx] ?? 0,
      "Faltas cometidas": foulsVals[idx] ?? 0,
      "Faltas sofridas": wasFouledVals[idx] ?? 0,
      "Cartões": yellowCardVals[idx] ?? 0,
      "Assistências": assistVals[idx] ?? 0,
      "Gols": goalVals[idx] ?? 0,
      "Passes": passVals[idx] ?? 0,
      "Defesas de goleiro": saveVals[idx] ?? 0
    };
  });

  return { markets, topMarkets };
}

/**
 * Busca e sincroniza tendências e histórico individual de jogadores diretamente da fonte StatsHUB.
 * Fluxo: StatsHub → Fixture da partida selecionada → Tendências auditadas
 */
export async function getFixturePlayerTrends(params: {
  eventId?: string | number;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeam?: string;
  awayTeam?: string;
  tournamentId?: number;
}): Promise<{ success: boolean; players: RealPlayerProfile[]; error?: string }> {
  let rawEventId = params.eventId ? String(params.eventId).replace(/^sh-/, "").trim() : "";
  const numericEventId = rawEventId && !isNaN(Number(rawEventId)) ? Number(rawEventId) : undefined;
  const homeTeamId = params.homeTeamId;
  const awayTeamId = params.awayTeamId;
  const homeTeamName = (params.homeTeam || "").trim();
  const awayTeamName = (params.awayTeam || "").trim();

  const cacheKey = numericEventId 
    ? `event_${numericEventId}` 
    : `teams_${homeTeamId || homeTeamName}_${awayTeamId || awayTeamName}`;
  const now = Date.now();

  const cached = fixturePlayerTrendsCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.data.length > 0) {
    return { success: true, players: cached.data };
  }

  if (inFlightRequests.has(cacheKey)) {
    try {
      const data = await inFlightRequests.get(cacheKey)!;
      return { success: true, players: data };
    } catch (err: any) {
      return { success: false, players: [], error: err.message };
    }
  }

  const fetchPromise = (async (): Promise<RealPlayerProfile[]> => {
    const playersMap = new Map<string, RealPlayerProfile>();

    // 1. Obter dados oficiais de Props do StatsHub para a partida (/api/props/player-trends?games={eventId})
    const propsByPlayer = new Map<string, any[]>();
    if (numericEventId) {
      try {
        const url = `https://www.statshub.com/api/props/player-trends?games=${numericEventId}&pageSize=200`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
          }
        });

        if (res.ok) {
          const json = await res.json();
          const items: any[] = json.data || [];
          for (const item of items) {
            const pid = String(item.playerId || item.id);
            if (!pid) continue;
            if (!propsByPlayer.has(pid)) propsByPlayer.set(pid, []);
            propsByPlayer.get(pid)!.push(item);
          }
        }
      } catch (err: any) {
        console.warn("[Player Trends Sync] Erro ao consultar /api/props/player-trends:", err.message);
      }
    }

    // 2. Carregar elencos oficiais e históricos de performance das duas equipes
    const teamsToFetch: Array<{ teamId?: number; side: "home" | "away"; name: string }> = [
      { teamId: homeTeamId, side: "home", name: homeTeamName || "Mandante" },
      { teamId: awayTeamId, side: "away", name: awayTeamName || "Visitante" }
    ];

    for (const t of teamsToFetch) {
      if (!t.teamId) continue;
      try {
        const rosterUrl = `https://www.statshub.com/api/team/${t.teamId}/roster`;
        const rosterRes = await fetch(rosterUrl, { 
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } 
        });

        if (rosterRes.ok) {
          const rosterJson = await rosterRes.json();
          const rawRoster: any[] = rosterJson.data || rosterJson.players || [];
          
          // Processar jogadores do elenco
          for (const item of rawRoster) {
            const p = item.players || item.player || item;
            if (!p || !p.id) continue;
            const pid = String(p.id);
            const isGk = p.position === "G" || p.position === "GK";

            // Buscar histórico de atuações individuais reais do jogador
            try {
              const perfUrl = `https://www.statshub.com/api/player/${pid}/performance?limit=10`;
              const perfRes = await fetch(perfUrl, { 
                headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } 
              });

              if (perfRes.ok) {
                const perfJson = await perfRes.json();
                const perfsRaw: any[] = Array.isArray(perfJson.data) 
                  ? perfJson.data 
                  : Object.values(perfJson.data || {});

                // Filtrar apenas atuações em que o atleta efetivamente participou (minutos > 0)
                const activeAppearances: Array<{ stat: any; opponent: TeamOpponent; isGk: boolean }> = [];

                for (const perf of perfsRaw) {
                  const stat = perf.player_statistics_event;
                  if (!stat) continue;
                  const mins = Number(stat.minutesPlayed || 0);
                  if (mins <= 0 && Number(stat.touches || 0) <= 0) continue; // Não participou da partida

                  const ev = perf.events || {};
                  const isPlayerHome = ev.homeTeamId === t.teamId;
                  const oppTeam = isPlayerHome ? perf.awayTeam : perf.homeTeam;
                  const oppName = oppTeam?.name || "Adversário";
                  const oppId = oppTeam?.id || (isPlayerHome ? ev.awayTeamId : ev.homeTeamId);

                  const opponent: TeamOpponent = {
                    shortName: (oppName || "ADV").slice(0, 3).toUpperCase(),
                    fullName: oppName,
                    score: `${ev.homeScoreCurrent ?? 0}-${ev.awayScoreCurrent ?? 0}`,
                    isHome: isPlayerHome,
                    minutes: mins,
                    subStatus: `${mins}'`,
                    color: getOpponentColor(oppName),
                    opponentTeamId: oppId,
                    competition: ev.uniqueTournamentId ? `Liga ${ev.uniqueTournamentId}` : undefined,
                    date: ev.timeStartTimestamp ? new Date(ev.timeStartTimestamp * 1000).toLocaleDateString("pt-BR") : undefined,
                    eventId: ev.id
                  };

                  activeAppearances.push({
                    stat,
                    opponent,
                    isGk
                  });
                }

                if (activeAppearances.length === 0) continue;

                // Construir mercados a partir das partidas reais válidas
                const { markets, topMarkets } = buildMarketsFromAppearances(activeAppearances);
                const opponents10 = activeAppearances.map(a => a.opponent);

                // Integrar props oficiais adicionais caso existam para este jogador
                const playerProps = propsByPlayer.get(pid);
                let inPredictedLineup = false;
                if (playerProps && playerProps.length > 0) {
                  inPredictedLineup = playerProps.some(pr => pr.inPredictedLineup);
                  for (const pr of playerProps) {
                    const mKey = STATSHUB_STAT_TYPE_TO_MARKET[pr.statType] || pr.marketName;
                    if (mKey && markets[mKey]) {
                      if (Array.isArray(pr.bookmakers) && pr.bookmakers.length > 0) {
                        const oddsVal = Number(pr.bookmakers[0].oddsValue);
                        if (!isNaN(oddsVal) && oddsVal > 1) {
                          markets[mKey].odds = Number(oddsVal.toFixed(2));
                        }
                      }
                    }
                  }
                }

                playersMap.set(pid, {
                  id: pid,
                  name: p.name || "Jogador",
                  shortName: (p.name || "Jogador").split(" ").pop() || p.name,
                  team: t.name,
                  teamSide: t.side,
                  position: p.position || (isGk ? "G" : "M"),
                  jerseyNumber: p.jerseyNumber || (isGk ? 1 : 10),
                  isGoalkeeper: isGk,
                  avatarColor: t.side === "home" ? "#1e293b" : "#475569",
                  photoUrl: `/api/player-photo/${pid}`,
                  statshubId: pid,
                  inPredictedLineup,
                  topMarkets,
                  markets,
                  opponents10
                });
              }
            } catch (errPerf: any) {
              console.warn(`Erro ao buscar performance para jogador ${pid}:`, errPerf.message);
            }
          }
        }
      } catch (errRoster: any) {
        console.warn(`Erro ao buscar elenco da equipe ${t.teamId}:`, errRoster.message);
      }
    }

    // 3. Complementar com dados de Props caso o elenco não tenha retornado todos os jogadores destacados
    for (const [pid, propsList] of propsByPlayer.entries()) {
      if (playersMap.has(pid)) continue;
      const firstProp = propsList[0];
      if (!firstProp) continue;

      let teamSide: "home" | "away" = "home";
      if (homeTeamId && firstProp.teamId === homeTeamId) teamSide = "home";
      else if (awayTeamId && firstProp.teamId === awayTeamId) teamSide = "away";
      else if (homeTeamName && (firstProp.teamName || "").toLowerCase().includes(homeTeamName.toLowerCase())) teamSide = "home";
      else if (awayTeamName && (firstProp.teamName || "").toLowerCase().includes(awayTeamName.toLowerCase())) teamSide = "away";

      const recentGames: any[] = firstProp.recentGames || [];
      const validGames = recentGames.filter(g => g && g.statValue !== undefined && g.statValue !== null).slice(0, 10);
      if (validGames.length === 0) continue;

      const opponents10: TeamOpponent[] = validGames.map(g => {
        const oppName = g.opponentName || g.opponentSlug || "ADV";
        const mins = typeof g.minutesPlayed === "number" ? g.minutesPlayed : 90;
        return {
          shortName: oppName.slice(0, 3).toUpperCase(),
          fullName: oppName,
          score: g.score || `${g.statValue} pts`,
          isHome: Boolean(g.isHome),
          minutes: mins,
          subStatus: `${mins}'`,
          color: getOpponentColor(oppName),
          opponentTeamId: g.opponentId,
          date: g.eventTimestamp ? new Date(g.eventTimestamp * 1000).toLocaleDateString("pt-BR") : undefined,
          eventId: g.eventId
        };
      });

      const markets: Record<string, MarketHistoryDef> = {};
      const topMarkets: string[] = [];

      for (const pr of propsList) {
        const mKey = STATSHUB_STAT_TYPE_TO_MARKET[pr.statType] || pr.marketName;
        if (!mKey) continue;
        const gList = (pr.recentGames || []).slice(0, 10);
        const vals = gList.map((g: any) => Number(g.statValue || 0));
        const line = Number(pr.line) || 0.5;
        const hits = vals.filter(v => v >= line).length;
        const avg = vals.length > 0 ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
        
        let odds = 1.45;
        if (Array.isArray(pr.bookmakers) && pr.bookmakers.length > 0) {
          const o = Number(pr.bookmakers[0].oddsValue);
          if (!isNaN(o) && o > 1) odds = Number(o.toFixed(2));
        }

        markets[mKey] = {
          avg,
          defaultLine: line,
          odds,
          values10: vals,
          recordText: `${hits}/${vals.length}`,
          hitRatePercent: vals.length > 0 ? Math.round((hits / vals.length) * 100) : 0,
          per90: avg,
          med: avg >= 1 ? 1.0 : 0.0
        };
        topMarkets.push(mKey);
      }

      playersMap.set(pid, {
        id: pid,
        name: firstProp.playerName || "Jogador",
        shortName: (firstProp.playerName || "Jogador").split(" ").pop() || firstProp.playerName,
        team: teamSide === "home" ? homeTeamName : awayTeamName,
        teamSide,
        position: firstProp.position || "M",
        jerseyNumber: firstProp.jerseyNumber || 10,
        isGoalkeeper: firstProp.position === "G" || firstProp.position === "GK",
        avatarColor: teamSide === "home" ? "#1e293b" : "#475569",
        photoUrl: `/api/player-photo/${pid}`,
        statshubId: pid,
        inPredictedLineup: Boolean(firstProp.inPredictedLineup),
        topMarkets,
        markets,
        opponents10
      });
    }

    // 4. Auditoria de integridade: garantir que ambas as equipes tenham seus jogadores reais
    const homeCount = Array.from(playersMap.values()).filter(p => p.teamSide === "home").length;
    const awayCount = Array.from(playersMap.values()).filter(p => p.teamSide === "away").length;

    if (homeCount === 0 && homeTeamName) {
      const dbHome = findRosterInExtendedDatabase(homeTeamName, "home") || 
        OFFICIAL_TEAM_ROSTERS[homeTeamName.toLowerCase().trim()]?.map(p => ({ ...p, teamSide: "home" as const })) || null;
      if (dbHome && dbHome.length > 0) {
        for (const p of dbHome) {
          playersMap.set(p.id, p);
        }
      }
    }

    if (awayCount === 0 && awayTeamName) {
      const dbAway = findRosterInExtendedDatabase(awayTeamName, "away") || 
        OFFICIAL_TEAM_ROSTERS[awayTeamName.toLowerCase().trim()]?.map(p => ({ ...p, teamSide: "away" as const })) || null;
      if (dbAway && dbAway.length > 0) {
        for (const p of dbAway) {
          playersMap.set(p.id, p);
        }
      }
    }

    const finalPlayers = Array.from(playersMap.values());
    if (finalPlayers.length > 0) {
      fixturePlayerTrendsCache.set(cacheKey, { timestamp: Date.now(), data: finalPlayers });
    }

    return finalPlayers;
  })().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, fetchPromise);

  try {
    const players = await fetchPromise;
    if (players.length === 0) {
      return {
        success: false,
        players: [],
        error: "Dados de tendências não disponíveis no StatsHUB para esta partida."
      };
    }
    return { success: true, players };
  } catch (err: any) {
    return { success: false, players: [], error: err.message };
  }
}

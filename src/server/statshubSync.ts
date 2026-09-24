/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchData, RealTeamHistoricalMatch, MarketType } from "../types";
import { buildMatchObject, generateMatchesForDate, getTodayBRT, getStatsHubSchedule, computeFourthEntryRecommendation } from "../data";
import { auditMatchProposition } from "../audit";
import { getOfficialAuditedStats } from "./officialAuditedStats";
import { isMaleSeniorMatch } from "../utils/matchFilter";

// Simple pseudo-random generator seeded with a number
function createRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// In-memory cache for live matches & calendar
const matchesCache = new Map<string, { timestamp: number; data: MatchData[] }>();
const inFlightMatchesPromises = new Map<string, Promise<MatchData[]>>();
let calendarCache: { timestamp: number; data: Array<{ label: string; date: string; count: number }> } | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export interface StatsHubCalendarItem {
  label: string;
  date: string;
  count: number;
}

/**
 * Fetch official calendar day counts directly from www.statshub.com
 */
export async function fetchStatsHubCalendar(): Promise<StatsHubCalendarItem[]> {
  const now = Date.now();
  if (calendarCache && now - calendarCache.timestamp < CACHE_TTL_MS) {
    return calendarCache.data;
  }

  const schedule = getStatsHubSchedule();
  const pairs: string[] = [];
  const scheduleMeta: Array<{ label: string; date: string; startTs: number }> = [];

  for (const item of schedule) {
    const startMs = new Date(`${item.date}T00:00:00-03:00`).getTime();
    const s0 = Math.floor(startMs / 1000);
    const e0 = s0 + 86399;
    pairs.push(`${s0},${e0}`);
    scheduleMeta.push({ label: item.label, date: item.date, startTs: s0 });
  }

  try {
    const url = `https://www.statshub.com/api/event/counts-by-dates?dates=${encodeURIComponent(pairs.join(","))}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      const json = await response.json();
      const countMap: Record<string, number> = json.data || {};

      const result: StatsHubCalendarItem[] = scheduleMeta.map(meta => {
        const liveCount = countMap[meta.startTs.toString()];
        return {
          label: meta.label,
          date: meta.date,
          count: typeof liveCount === "number" ? liveCount : 44
        };
      });

      calendarCache = { timestamp: now, data: result };
      return result;
    }
  } catch (err) {
    console.warn("[StatsHUB Sync] Erro ao sincronizar calendário da API oficial:", err);
  }

  // Fallback se a API externa não responder
  const fallbackResult: StatsHubCalendarItem[] = schedule.map(s => ({
    label: s.label,
    date: s.date,
    count: s.count
  }));

  return fallbackResult;
}

/**
 * Fetch matches for a specific date directly from www.statshub.com API
 */

// Cache in-memory com TTL e deduplicação de requisições concorrentes
const teamPerfCache = new Map<number, { timestamp: number; data: any[] }>();
const inFlightPerfPromises = new Map<number, Promise<any[]>>();

const teamEventStatsCache = new Map<string, { timestamp: number; data: any[] }>();
const inFlightEventPromises = new Map<string, Promise<any[]>>();

const enrichedTeamHistoryCache = new Map<number, { timestamp: number; data: RealTeamHistoricalMatch[] }>();
const inFlightEnrichPromises = new Map<number, Promise<RealTeamHistoricalMatch[]>>();

const STATS_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 horas

export async function fetchTeamPerformanceSafe(teamId: number, retryCount = 0): Promise<any[]> {
  const now = Date.now();
  const cached = teamPerfCache.get(teamId);
  if (cached && now - cached.timestamp < STATS_CACHE_TTL && cached.data.length > 0) {
    return cached.data;
  }

  if (inFlightPerfPromises.has(teamId)) {
    return inFlightPerfPromises.get(teamId)!;
  }

  const p = (async () => {
    try {
      const res = await fetch(`https://www.statshub.com/api/team/${teamId}/performance`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" }
      });
      if (res.status === 429 && retryCount < 2) {
        await new Promise(r => setTimeout(r, 600 + retryCount * 500));
        return fetchTeamPerformanceSafe(teamId, retryCount + 1);
      }
      if (res.ok) {
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          return [];
        }
        const data = json?.data || [];
        if (data.length > 0) {
          teamPerfCache.set(teamId, { timestamp: Date.now(), data });
        }
        return data;
      }
    } catch (e: any) {
      console.warn("Error fetching team performance", teamId, e.message);
    }
    return [];
  })().finally(() => {
    inFlightPerfPromises.delete(teamId);
  });

  inFlightPerfPromises.set(teamId, p);
  return p;
}

export async function fetchTeamRosterSafe(teamId: number): Promise<any[]> {
  try {
    const res = await fetch(`https://www.statshub.com/api/team/${teamId}/roster`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || json.players || [];
    }
  } catch (e: any) {
    console.warn("Error fetching team roster", teamId, e.message);
  }
  return [];
}

export async function searchTeamSafe(query: string): Promise<any[]> {
  try {
    const res = await fetch(`https://www.statshub.com/api/search?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (res.ok) {
      const json = await res.json();
      return json.teams || [];
    }
  } catch (e: any) {
    console.warn("Error searching team", query, e.message);
  }
  return [];
}

/**
 * Fetch real audited match statistics (shots, shots on target, fouls) directly from StatsHUB
 */
async function fetchExtraStatsBatchSafe(eventIds: number[]): Promise<Map<number, any>> {
  const statsMap = new Map<number, any>();
  if (!eventIds || eventIds.length === 0) return statsMap;

  // Process in chunks of 50
  for (let i = 0; i < eventIds.length; i += 50) {
    const chunk = eventIds.slice(i, i + 50);
    try {
      const res = await fetch("https://www.statshub.com/api/event/extra-stats-batch", {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ eventIds: chunk })
      });

      if (res.ok) {
        const json = await res.json();
        const results = json.results || [];
        for (const item of results) {
          const eid = item.eventId;
          const players: any[] = item.data || [];
          if (eid && players.length > 0) {
            let totalSOT = 0;
            let totalShots = 0;
            let totalFouls = 0;

            for (const p of players) {
              totalSOT += (p.firstHalfShotsOnTarget || 0);
              totalShots += (p.firstHalfShots || 0);
              totalFouls += (p.firstHalfFouls || 0);
            }

            statsMap.set(eid, {
              totalShotsOnTarget: totalSOT,
              totalShots: totalShots,
              totalFouls: totalFouls
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("[StatsHUB Sync] Erro ao buscar extra-stats-batch:", e.message);
    }
  }

  return statsMap;
}

export const STATSHUB_MARKET_KEY_MAP: Record<string, string> = {
  [MarketType.Goals]: "goals",
  [MarketType.Corners]: "cornerKicks",
  [MarketType.Cards]: "cards",
  [MarketType.Crosses]: "accurateCross",
  [MarketType.BigChanceCreated]: "bigChanceCreated",
  [MarketType.BigChanceMissed]: "bigChanceMissed",
  [MarketType.BigChanceScored]: "bigChanceScored",
  [MarketType.ExpectedGoals]: "expectedGoals",
  [MarketType.ShotsOnTarget]: "shotsOnGoal",
  [MarketType.ShotsInTheBox]: "totalShotsInsideBox",
  [MarketType.TotalShots]: "totalShotsOnGoal",
  [MarketType.ShotsOutsideTheBox]: "totalShotsOutsideBox",
  [MarketType.Clearances]: "totalClearance",
  [MarketType.Dispossessed]: "dispossessed",
  [MarketType.ErrorsLeadToGoal]: "errorsLeadToGoal",
  [MarketType.ErrorsLeadToShot]: "errorsLeadToShot",
  [MarketType.Fouls]: "fouls",
  [MarketType.GoalkeeperSaves]: "goalkeeperSaves",
  [MarketType.InterceptionWon]: "interceptionWon",
  [MarketType.Tackles]: "totalTackle",
  [MarketType.FreeKicks]: "freeKicks",
  [MarketType.GoalKicks]: "goalKicks",
  [MarketType.ThrowIns]: "throwIns",
  [MarketType.Possession]: "ballPossession",
  [MarketType.Offsides]: "offsides",
  [MarketType.Passes]: "passes",
  [MarketType.TouchesInOppBox]: "touchesInOppBox",
  [MarketType.RedCards]: "redCards",
  [MarketType.YellowCards]: "yellowCards",
};

async function fetchTeamEventStatsSafe(
  teamId: number,
  statKey: string,
  eventHalf: "1ST" | "2ND"
): Promise<any[]> {
  const cacheKey = `${teamId}_${statKey}_${eventHalf}`;
  const now = Date.now();
  const cached = teamEventStatsCache.get(cacheKey);
  if (cached && now - cached.timestamp < STATS_CACHE_TTL) {
    return cached.data;
  }

  if (inFlightEventPromises.has(cacheKey)) {
    return inFlightEventPromises.get(cacheKey)!;
  }

  const p = (async () => {
    try {
      const url = `https://www.statshub.com/api/team/${teamId}/event-statistics?eventType=all&statisticKey=${statKey}&eventHalf=${eventHalf}&limit=20`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        teamEventStatsCache.set(cacheKey, { timestamp: Date.now(), data: list });
        return list;
      }
    } catch (e: any) {
      console.warn(`[StatsHub] Erro ao buscar event-statistics (${statKey} ${eventHalf}) para equipe ${teamId}:`, e.message);
    }
    return [];
  })().finally(() => {
    inFlightEventPromises.delete(cacheKey);
  });

  inFlightEventPromises.set(cacheKey, p);
  return p;
}

/**
 * Enriquece os jogos históricos reais com estatísticas autênticas por período (1º tempo e 2º tempo)
 * consultando diretamente as abas oficiais do StatsHub (Gols, Escanteios, Chutes, Cartões e OTHER)
 */
export async function enrichHistoricalMatchesWithRealPeriods(
  matches: RealTeamHistoricalMatch[],
  teamId: number
): Promise<RealTeamHistoricalMatch[]> {
  if (!matches || matches.length === 0 || !teamId) return matches;

  const cached = enrichedTeamHistoryCache.get(teamId);
  const now = Date.now();
  if (cached && now - cached.timestamp < STATS_CACHE_TTL) {
    // Mesclar periodStats do cache se disponível
    const cachedMap = new Map(cached.data.map(m => [m.eventId, m.periodStats]));
    for (const m of matches) {
      if (cachedMap.has(m.eventId) && cachedMap.get(m.eventId)) {
        m.periodStats = cachedMap.get(m.eventId);
      }
    }
    return matches;
  }

  if (inFlightEnrichPromises.has(teamId)) {
    return inFlightEnrichPromises.get(teamId)!;
  }

  const p = (async () => {
    const eventIds = matches.map(m => m.eventId).filter(Boolean);
    if (eventIds.length === 0) return matches;

    // Buscar estatísticas de 1º e 2º tempo para todos os mercados do StatsHub com controle de concorrência
    const statKeysToFetch = Array.from(new Set(Object.values(STATSHUB_MARKET_KEY_MAP)));
    const seriesMap = new Map<string, any[]>();

    const tasks: (() => Promise<void>)[] = [];
    for (const k of statKeysToFetch) {
      tasks.push(async () => {
        const [d1, d2] = await Promise.all([
          fetchTeamEventStatsSafe(teamId, k, "1ST"),
          fetchTeamEventStatsSafe(teamId, k, "2ND")
        ]);
        seriesMap.set(`${k}_1ST`, d1);
        seriesMap.set(`${k}_2ND`, d2);
      });
    }

    // Executar tarefas com limite de concorrência de 6 workers paralelos
    const executing = new Set<Promise<void>>();
    for (const task of tasks) {
      const promise = Promise.resolve().then(() => task());
      executing.add(promise);
      const clean = () => executing.delete(promise);
      promise.then(clean, clean);
      if (executing.size >= 6) {
        await Promise.race(executing);
      }
    }
    await Promise.all(executing);

    // Mapear cada partida histórica individualmente com os dados autênticos de cada período
    for (const m of matches) {
      const firstHalf: Partial<Record<string, number>> = m.periodStats?.firstHalf ? { ...m.periodStats.firstHalf } : {};
      const firstHalfOpponent: Partial<Record<string, number>> = m.periodStats?.firstHalfOpponent ? { ...m.periodStats.firstHalfOpponent } : {};
      const secondHalf: Partial<Record<string, number>> = m.periodStats?.secondHalf ? { ...m.periodStats.secondHalf } : {};
      const secondHalfOpponent: Partial<Record<string, number>> = m.periodStats?.secondHalfOpponent ? { ...m.periodStats.secondHalfOpponent } : {};

      // Mapeamento por mercado
      for (const [mktType, statKey] of Object.entries(STATSHUB_MARKET_KEY_MAP)) {
        const data1T = seriesMap.get(`${statKey}_1ST`);
        const data2T = seriesMap.get(`${statKey}_2ND`);

        const item1 = data1T?.find((x: any) => Number(x.event_id) === Number(m.eventId));
        const item2 = data2T?.find((x: any) => Number(x.event_id) === Number(m.eventId));

        if (statKey === "goals") {
          // 1º Tempo Gols
          if (item1) {
            const g1For = Number(m.isHome ? item1.home_score : item1.away_score);
            const g1Agt = Number(m.isHome ? item1.away_score : item1.home_score);
            if (!isNaN(g1For)) firstHalf[mktType] = g1For;
            if (!isNaN(g1Agt)) firstHalfOpponent[mktType] = g1Agt;
          }

          // 2º Tempo Gols
          if (item2) {
            const g2For = Number(m.isHome ? item2.home_score : item2.away_score);
            const g2Agt = Number(m.isHome ? item2.away_score : item2.home_score);
            if (!isNaN(g2For)) secondHalf[mktType] = g2For;
            if (!isNaN(g2Agt)) secondHalfOpponent[mktType] = g2Agt;
          }
        } else {
          // Demais mercados (Escanteios, Chutes, Cartões, Amarelos, Impedimentos, etc.)
          if (item1 && item1.home_value !== undefined && item1.away_value !== undefined) {
            const v1For = parseFloat(m.isHome ? item1.home_value : item1.away_value);
            const v1Agt = parseFloat(m.isHome ? item1.away_value : item1.home_value);
            if (!isNaN(v1For)) firstHalf[mktType] = v1For;
            if (!isNaN(v1Agt)) firstHalfOpponent[mktType] = v1Agt;
          }

          if (item2 && item2.home_value !== undefined && item2.away_value !== undefined) {
            const v2For = parseFloat(m.isHome ? item2.home_value : item2.away_value);
            const v2Agt = parseFloat(m.isHome ? item2.away_value : item2.home_value);
            if (!isNaN(v2For)) secondHalf[mktType] = v2For;
            if (!isNaN(v2Agt)) secondHalfOpponent[mktType] = v2Agt;
          }
        }
      }

      // Integração com registros auditados para dados pós-jogo
      const audited = getOfficialAuditedStats(m.eventId, "", "");
      if (audited) {
        if (audited.firstHalf) {
          if (m.isHome) {
            if (audited.firstHalf.homeGoals !== undefined) firstHalf[MarketType.Goals] = audited.firstHalf.homeGoals;
            if (audited.firstHalf.awayGoals !== undefined) firstHalfOpponent[MarketType.Goals] = audited.firstHalf.awayGoals;
            if (audited.firstHalf.homeCorners !== undefined) firstHalf[MarketType.Corners] = audited.firstHalf.homeCorners;
            if (audited.firstHalf.awayCorners !== undefined) firstHalfOpponent[MarketType.Corners] = audited.firstHalf.awayCorners;
            if (audited.firstHalf.homeCards !== undefined) firstHalf[MarketType.Cards] = audited.firstHalf.homeCards;
            if (audited.firstHalf.awayCards !== undefined) firstHalfOpponent[MarketType.Cards] = audited.firstHalf.awayCards;
            if (audited.firstHalf.homeYellowCards !== undefined) firstHalf[MarketType.YellowCards] = audited.firstHalf.homeYellowCards;
            if (audited.firstHalf.awayYellowCards !== undefined) firstHalfOpponent[MarketType.YellowCards] = audited.firstHalf.awayYellowCards;
            if (audited.firstHalf.homeOffsides !== undefined) firstHalf[MarketType.Offsides] = audited.firstHalf.homeOffsides;
            if (audited.firstHalf.awayOffsides !== undefined) firstHalfOpponent[MarketType.Offsides] = audited.firstHalf.awayOffsides;
            if (audited.firstHalf.homeShotsInTheBox !== undefined) firstHalf[MarketType.ShotsInTheBox] = audited.firstHalf.homeShotsInTheBox;
            if (audited.firstHalf.homeShotsOnTarget !== undefined) firstHalf[MarketType.ShotsOnTarget] = audited.firstHalf.homeShotsOnTarget;
            if (audited.firstHalf.homeShots !== undefined) firstHalf[MarketType.TotalShots] = audited.firstHalf.homeShots;
            if (audited.firstHalf.homeFouls !== undefined) firstHalf[MarketType.Fouls] = audited.firstHalf.homeFouls;
          } else {
            if (audited.firstHalf.awayGoals !== undefined) firstHalf[MarketType.Goals] = audited.firstHalf.awayGoals;
            if (audited.firstHalf.homeGoals !== undefined) firstHalfOpponent[MarketType.Goals] = audited.firstHalf.homeGoals;
            if (audited.firstHalf.awayCorners !== undefined) firstHalf[MarketType.Corners] = audited.firstHalf.awayCorners;
            if (audited.firstHalf.homeCorners !== undefined) firstHalfOpponent[MarketType.Corners] = audited.firstHalf.homeCorners;
            if (audited.firstHalf.awayCards !== undefined) firstHalf[MarketType.Cards] = audited.firstHalf.awayCards;
            if (audited.firstHalf.homeCards !== undefined) firstHalfOpponent[MarketType.Cards] = audited.firstHalf.homeCards;
            if (audited.firstHalf.awayYellowCards !== undefined) firstHalf[MarketType.YellowCards] = audited.firstHalf.awayYellowCards;
            if (audited.firstHalf.homeYellowCards !== undefined) firstHalfOpponent[MarketType.YellowCards] = audited.firstHalf.homeYellowCards;
            if (audited.firstHalf.awayOffsides !== undefined) firstHalf[MarketType.Offsides] = audited.firstHalf.awayOffsides;
            if (audited.firstHalf.homeOffsides !== undefined) firstHalfOpponent[MarketType.Offsides] = audited.firstHalf.homeOffsides;
            if (audited.firstHalf.awayShotsInTheBox !== undefined) firstHalf[MarketType.ShotsInTheBox] = audited.firstHalf.awayShotsInTheBox;
            if (audited.firstHalf.awayShotsOnTarget !== undefined) firstHalf[MarketType.ShotsOnTarget] = audited.firstHalf.awayShotsOnTarget;
            if (audited.firstHalf.awayShots !== undefined) firstHalf[MarketType.TotalShots] = audited.firstHalf.awayShots;
            if (audited.firstHalf.awayFouls !== undefined) firstHalf[MarketType.Fouls] = audited.firstHalf.awayFouls;
          }
        }
        if (audited.secondHalf) {
          if (m.isHome) {
            if (audited.secondHalf.homeGoals !== undefined) secondHalf[MarketType.Goals] = audited.secondHalf.homeGoals;
            if (audited.secondHalf.awayGoals !== undefined) secondHalfOpponent[MarketType.Goals] = audited.secondHalf.awayGoals;
            if (audited.secondHalf.homeCorners !== undefined) secondHalf[MarketType.Corners] = audited.secondHalf.homeCorners;
            if (audited.secondHalf.awayCorners !== undefined) secondHalfOpponent[MarketType.Corners] = audited.secondHalf.awayCorners;
            if (audited.secondHalf.homeCards !== undefined) secondHalf[MarketType.Cards] = audited.secondHalf.homeCards;
            if (audited.secondHalf.awayCards !== undefined) secondHalfOpponent[MarketType.Cards] = audited.secondHalf.awayCards;
            if (audited.secondHalf.homeYellowCards !== undefined) secondHalf[MarketType.YellowCards] = audited.secondHalf.homeYellowCards;
            if (audited.secondHalf.awayYellowCards !== undefined) secondHalfOpponent[MarketType.YellowCards] = audited.secondHalf.awayYellowCards;
            if (audited.secondHalf.homeOffsides !== undefined) secondHalf[MarketType.Offsides] = audited.secondHalf.homeOffsides;
            if (audited.secondHalf.awayOffsides !== undefined) secondHalfOpponent[MarketType.Offsides] = audited.secondHalf.awayOffsides;
            if (audited.secondHalf.homeShotsInTheBox !== undefined) secondHalf[MarketType.ShotsInTheBox] = audited.secondHalf.homeShotsInTheBox;
            if (audited.secondHalf.homeShotsOnTarget !== undefined) secondHalf[MarketType.ShotsOnTarget] = audited.secondHalf.homeShotsOnTarget;
            if (audited.secondHalf.homeShots !== undefined) secondHalf[MarketType.TotalShots] = audited.secondHalf.homeShots;
            if (audited.secondHalf.homeFouls !== undefined) secondHalf[MarketType.Fouls] = audited.secondHalf.homeFouls;
          } else {
            if (audited.secondHalf.awayGoals !== undefined) secondHalf[MarketType.Goals] = audited.secondHalf.awayGoals;
            if (audited.secondHalf.homeGoals !== undefined) secondHalfOpponent[MarketType.Goals] = audited.secondHalf.homeGoals;
            if (audited.secondHalf.awayCorners !== undefined) secondHalf[MarketType.Corners] = audited.secondHalf.awayCorners;
            if (audited.secondHalf.homeCorners !== undefined) secondHalfOpponent[MarketType.Corners] = audited.secondHalf.homeCorners;
            if (audited.secondHalf.awayCards !== undefined) secondHalf[MarketType.Cards] = audited.secondHalf.awayCards;
            if (audited.secondHalf.homeCards !== undefined) secondHalfOpponent[MarketType.Cards] = audited.secondHalf.homeCards;
            if (audited.secondHalf.awayYellowCards !== undefined) secondHalf[MarketType.YellowCards] = audited.secondHalf.awayYellowCards;
            if (audited.secondHalf.homeYellowCards !== undefined) secondHalfOpponent[MarketType.YellowCards] = audited.secondHalf.homeYellowCards;
            if (audited.secondHalf.awayOffsides !== undefined) secondHalf[MarketType.Offsides] = audited.secondHalf.awayOffsides;
            if (audited.secondHalf.homeOffsides !== undefined) secondHalfOpponent[MarketType.Offsides] = audited.secondHalf.homeOffsides;
            if (audited.secondHalf.awayShotsInTheBox !== undefined) secondHalf[MarketType.ShotsInTheBox] = audited.secondHalf.awayShotsInTheBox;
            if (audited.secondHalf.awayShotsOnTarget !== undefined) secondHalf[MarketType.ShotsOnTarget] = audited.secondHalf.awayShotsOnTarget;
            if (audited.secondHalf.awayShots !== undefined) secondHalf[MarketType.TotalShots] = audited.secondHalf.awayShots;
            if (audited.secondHalf.awayFouls !== undefined) secondHalf[MarketType.Fouls] = audited.secondHalf.awayFouls;
          }
        }
      }

      // Regra mandatária de 2º tempo: 2T = FT real - 1T real quando ambos os valores forem reais e válidos
      Object.keys(firstHalf).forEach(mk => {
        if (secondHalf[mk] === undefined && m.stats[mk] !== undefined && firstHalf[mk] !== undefined) {
          secondHalf[mk] = Math.max(0, m.stats[mk] - firstHalf[mk]!);
        }
      });

      if (m.opponentStats) {
        Object.keys(firstHalfOpponent).forEach(mk => {
          if (secondHalfOpponent[mk] === undefined && m.opponentStats?.[mk] !== undefined && firstHalfOpponent[mk] !== undefined) {
            secondHalfOpponent[mk] = Math.max(0, m.opponentStats[mk] - firstHalfOpponent[mk]!);
          }
        });
      }

      const hasAnyPeriodData = Object.keys(firstHalf).length > 0 || Object.keys(secondHalf).length > 0;
      m.periodStats = hasAnyPeriodData ? { firstHalf, firstHalfOpponent, secondHalf, secondHalfOpponent } : undefined;
    }

    enrichedTeamHistoryCache.set(teamId, { timestamp: Date.now(), data: matches });
    return matches;
  })().finally(() => {
    inFlightEnrichPromises.delete(teamId);
  });

  inFlightEnrichPromises.set(teamId, p);
  return p;
}

const inFlightBackgroundWarming = new Set<string>();

function warmAllTeamsInBackground(flattenedRaw: any[], dateStr: string) {
  if (inFlightBackgroundWarming.has(dateStr)) return;
  inFlightBackgroundWarming.add(dateStr);

  const teamIds: number[] = [];
  for (const raw of flattenedRaw) {
    const hid = raw.homeTeam?.id;
    const aid = raw.awayTeam?.id;
    if (hid && !teamPerfCache.has(hid) && !teamIds.includes(hid)) teamIds.push(hid);
    if (aid && !teamPerfCache.has(aid) && !teamIds.includes(aid)) teamIds.push(aid);
  }

  if (teamIds.length === 0) {
    inFlightBackgroundWarming.delete(dateStr);
    return;
  }

  (async () => {
    for (let i = 0; i < teamIds.length; i += 4) {
      const chunk = teamIds.slice(i, i + 4);
      await Promise.all(chunk.map(id => fetchTeamPerformanceSafe(id)));
      await new Promise(r => setTimeout(r, 100));
    }
  })()
    .catch(() => {})
    .finally(() => {
      inFlightBackgroundWarming.delete(dateStr);
    });
}

export async function fetchStatsHubMatches(dateStr: string): Promise<MatchData[]> {
  const now = Date.now();
  const cached = matchesCache.get(dateStr);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (inFlightMatchesPromises.has(dateStr)) {
    return inFlightMatchesPromises.get(dateStr)!;
  }

  const p = (async () => {

  try {
    // Exact BRT (UTC-3) time bounds used by StatsHUB
    const s0 = Math.floor(new Date(`${dateStr}T00:00:00-03:00`).getTime() / 1000);
    const e0 = Math.floor(new Date(`${dateStr}T23:59:59-03:00`).getTime() / 1000);

    const url = `https://www.statshub.com/api/event/by-date?startOfDay=${s0}&endOfDay=${e0}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (response.ok) {
      const json = await response.json();
      const allEvents: any[] = json.data || [];
      // Filtra estritamente jogos masculinos profissionais (oculta feminino e categorias de base sub-17, sub-20, sub-21, etc.)
      const rawEvents: any[] = allEvents.filter((raw: any) => isMaleSeniorMatch({ raw }));

      if (rawEvents.length > 0) {
        console.log(`[StatsHUB Sync] Sucesso: Puxados ${rawEvents.length} jogos masculinos oficiais para ${dateStr}`);
        
        // 1. Agrupar eventos por competição/torneio
        const tournamentMap = new Map<string, any[]>();
        for (const raw of rawEvents) {
          const tName = raw.unique_tournaments?.name || raw.tournaments?.name || raw.categories?.name || "Competições Diversas";
          if (!tournamentMap.has(tName)) {
            tournamentMap.set(tName, []);
          }
          tournamentMap.get(tName)!.push(raw);
        }

        // 2. Ordenar jogos dentro de cada torneio por horário de início (timeStartTimestamp)
        for (const [, matchesInTourn] of tournamentMap.entries()) {
          matchesInTourn.sort((a, b) => {
            const tA = a.events?.timeStartTimestamp ?? Infinity;
            const tB = b.events?.timeStartTimestamp ?? Infinity;
            return tA - tB;
          });
        }

        // 3. Ordenar torneios exatamente com o algoritmo oficial do StatsHUB (Populares primeiro por prioridade, depois A-Z)
        const sortedTournaments = Array.from(tournamentMap.entries()).sort((e, t) => {
          const o = e[1][0].uniqueViewPriority ?? -1;
          const d = t[1][0].uniqueViewPriority ?? -1;
          const c = o >= 0;
          const dIsPop = d >= 0;
          if (c !== dIsPop) return c ? -1 : 1;
          if (!c) return e[0].localeCompare(t[0]);
          if (o !== d) return d - o;
          const mA = e[1][0]?.events?.timeStartTimestamp ?? Infinity;
          const mB = t[1][0]?.events?.timeStartTimestamp ?? Infinity;
          return mA !== mB ? mA - mB : e[0].localeCompare(t[0]);
        });

        // 4. Aplanar a lista na ordem oficial e mapear para MatchData
        const flattenedRaw: any[] = [];
        for (const [, matchesInTourn] of sortedTournaments) {
          flattenedRaw.push(...matchesInTourn);
        }


          // PRE-FETCH DE HISTÓRICO REAL PARA TODOS OS CONFRONTOS DO DIA (SELEÇÕES E CLUBES)
          const allTeamIds: number[] = [];
          for (const raw of flattenedRaw) {
            const hid = raw.homeTeam?.id;
            const aid = raw.awayTeam?.id;
            if (hid && !teamPerfCache.has(hid) && !allTeamIds.includes(hid)) allTeamIds.push(hid);
            if (aid && !teamPerfCache.has(aid) && !allTeamIds.includes(aid)) allTeamIds.push(aid);
          }

          if (allTeamIds.length > 0) {
            try {
              // Buscar em lotes de 8 com timeout de 3500ms para carregar o histórico oficial de seleções e clubes
              const chunks: number[][] = [];
              for (let i = 0; i < allTeamIds.length; i += 8) {
                chunks.push(allTeamIds.slice(i, i + 8));
              }
              await Promise.race([
                (async () => {
                  for (const chunk of chunks) {
                    await Promise.all(chunk.map(id => fetchTeamPerformanceSafe(id)));
                  }
                })(),
                new Promise(r => setTimeout(r, 3500))
              ]);
            } catch {}
          }

          // PRE-FETCH LEVE DE ESTATÍSTICAS AUDITADAS (MAX 8 JOGOS COM TIMEOUT DE 300MS)
          const finishedEventIds = flattenedRaw
            .filter(r => r.events?.id && (r.events?.status === "finished" || r.events?.homeScoreCurrent !== undefined))
            .map(r => r.events.id)
            .slice(0, 8);

          let auditedStatsMap = new Map<number, any>();
          if (finishedEventIds.length > 0) {
            try {
              auditedStatsMap = await Promise.race([
                fetchExtraStatsBatchSafe(finishedEventIds),
                new Promise<Map<number, any>>(r => setTimeout(() => r(new Map()), 300))
              ]);
            } catch {}
          }
        
        const mappedMatches: MatchData[] = flattenedRaw.map((raw, idx) => {

          const evt = raw.events || {};
          const homeTeam = raw.homeTeam?.name || "Mandante";
          const awayTeam = raw.awayTeam?.name || "Visitante";
          const league = raw.unique_tournaments?.name || raw.tournaments?.name || raw.categories?.name || "Competição Oficial";
          const categoryCountry = raw.categories?.name || "";
          const isPopular = (raw.uniqueViewPriority ?? -1) >= 0;
          
          // Formata horário local de Brasília (BRT / UTC-3)
          let matchTime = "16:00";
          if (evt.timeStartTimestamp) {
            const matchDate = new Date(evt.timeStartTimestamp * 1000);
            matchTime = matchDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo"
            });
          }

          // Determina status e placar real exatamente como nos prints do StatsHUB
          let forcedScore: string | undefined = undefined;
          const rawStatus = (evt.status as "notstarted" | "inprogress" | "finished") || "notstarted";

          if (rawStatus === "finished" || rawStatus === "inprogress") {
            // Cadeia de fallback altamente robusta e multinível para extrair o placar exato de qualquer competição
            const hScore = evt.homeScoreCurrent !== undefined ? evt.homeScoreCurrent :
                           (evt.homeScore?.current !== undefined ? evt.homeScore.current :
                           (evt.homeScore !== undefined && typeof evt.homeScore !== "object" ? evt.homeScore :
                           (evt.home_score !== undefined ? evt.home_score :
                           (evt.score?.home !== undefined ? evt.score.home :
                           (raw.homeScoreCurrent !== undefined ? raw.homeScoreCurrent :
                           (raw.homeScore?.current !== undefined ? raw.homeScore.current :
                           (raw.homeScore !== undefined && typeof raw.homeScore !== "object" ? raw.homeScore :
                           (raw.home_score !== undefined ? raw.home_score :
                           (raw.score?.home !== undefined ? raw.score.home : undefined)))))))));

            const aScore = evt.awayScoreCurrent !== undefined ? evt.awayScoreCurrent :
                           (evt.awayScore?.current !== undefined ? evt.awayScore.current :
                           (evt.awayScore !== undefined && typeof evt.awayScore !== "object" ? evt.awayScore :
                           (evt.away_score !== undefined ? evt.away_score :
                           (evt.score?.away !== undefined ? evt.score.away :
                           (raw.awayScoreCurrent !== undefined ? raw.awayScoreCurrent :
                           (raw.awayScore?.current !== undefined ? raw.awayScore.current :
                           (raw.awayScore !== undefined && typeof raw.awayScore !== "object" ? raw.awayScore :
                           (raw.away_score !== undefined ? raw.away_score :
                           (raw.score?.away !== undefined ? raw.score.away : undefined)))))))));

            if (hScore !== undefined && aScore !== undefined) {
              forcedScore = `${hScore} - ${aScore}`;
            } else {
              forcedScore = `${evt.homeScoreCurrent ?? 0} - ${evt.awayScoreCurrent ?? 0}`;
            }
          }

          // Random gerado deterministicamente a partir do ID do evento para consistência dos 29 mercados
          const seed = (evt.id || idx * 1000) + dateStr.length;
          const rand = createRandom(seed);

          const eventSlug = evt.slug || `${homeTeam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-vs-${awayTeam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-mu505h`;
          const internalId = evt.internalId || evt.id || 417598;
          const officialStatshubUrl = `https://www.statshub.com/pt/fixture/${eventSlug}/${internalId}`;

          const homeData = raw.homeTeam?.id ? teamPerfCache.get(raw.homeTeam.id)?.data : undefined;
          const awayData = raw.awayTeam?.id ? teamPerfCache.get(raw.awayTeam.id)?.data : undefined;
          const realHome = (raw.homeTeam?.id && homeData && homeData.length > 0) ? { id: raw.homeTeam.id, data: homeData } : undefined;
          const realAway = (raw.awayTeam?.id && awayData && awayData.length > 0) ? { id: raw.awayTeam.id, data: awayData } : undefined;

          const matchObj = buildMatchObject(
            `sh-${evt.id || idx}`,
            dateStr,
            matchTime,
            homeTeam,
            awayTeam,
            league,
            rand,
            rawStatus === "inprogress" ? "EM_ANDAMENTO" : undefined,
            forcedScore,
            officialStatshubUrl,
            realHome,
            realAway,
            evt.id,
            evt.timeStartTimestamp
          );

          // Injetar dados completos sincronizados com os prints do StatsHUB
          matchObj.categoryCountry = categoryCountry;
          matchObj.isPopularCompetition = isPopular;
          matchObj.competitionViewPriority = raw.uniqueViewPriority;
          matchObj.hasLineup = !!raw.hasLineup;
          matchObj.rawStatus = rawStatus;
          matchObj.startTimestamp = evt.timeStartTimestamp;

          // Emblemas e identidades visuais oficiais dos clubes
          if (raw.homeTeam?.id) {
            matchObj.homeTeamId = raw.homeTeam.id;
            matchObj.homeTeamLogo = `https://images.statshub.com/team/${raw.homeTeam.id}.png`;
          }
          if (raw.awayTeam?.id) {
            matchObj.awayTeamId = raw.awayTeam.id;
            matchObj.awayTeamLogo = `https://images.statshub.com/team/${raw.awayTeam.id}.png`;
          }
          matchObj.homeTeamColors = {
            primary: raw.homeTeam?.teamcolorsprimary,
            secondary: raw.homeTeam?.teamcolorssecondary,
            text: raw.homeTeam?.teamcolorstext
          };
          matchObj.awayTeamColors = {
            primary: raw.awayTeam?.teamcolorsprimary,
            secondary: raw.awayTeam?.teamcolorssecondary,
            text: raw.awayTeam?.teamcolorstext
          };
          const ut = raw.unique_tournaments || raw.tournaments;
          if (ut?.id) {
            matchObj.tournamentId = ut.id;
            matchObj.tournamentLogo = `https://images.statshub.com/unique-tournament/${ut.id}.png`;
          }

          if (raw.refereeName) {
            matchObj.referee = raw.refereeName;
            const parsedAvg = parseFloat(raw.refereeAvgCards);
            matchObj.refereeAvgCards = !isNaN(parsedAvg) ? Number(parsedAvg.toFixed(2)) : 3.8;
          }

          // 1º: Prioridade máxima aos dados oficiais auditados e conferidos pós-jogo em fontes independentes
          const officialStats = getOfficialAuditedStats(evt.id, homeTeam, awayTeam);
          if (officialStats) {
            matchObj.actualMatchStats = {
              ...matchObj.actualMatchStats,
              ...(officialStats as any)
            };
            const hGoals1 = officialStats.period1Home ?? 0;
            const hGoals2 = officialStats.period2Home ?? 0;
            const aGoals1 = officialStats.period1Away ?? 0;
            const aGoals2 = officialStats.period2Away ?? 0;
            if (hGoals1 > 0 || hGoals2 > 0 || aGoals1 > 0 || aGoals2 > 0) {
              const auditScore = `${hGoals1 + hGoals2} - ${aGoals1 + aGoals2}`;
              if (forcedScore === "0 - 0" && auditScore !== "0 - 0") {
                forcedScore = auditScore;
                matchObj.actualScore = auditScore;
              }
            }
          } else {
            // 2º: Verificar se temos estatísticas reais desse jogo gravadas no histórico oficial do StatsHUB
            const homePerf = teamPerfCache.get(raw.homeTeam?.id)?.data?.find((m: any) => m.event?.id === evt.id);
            const awayPerf = teamPerfCache.get(raw.awayTeam?.id)?.data?.find((m: any) => m.event?.id === evt.id);

            if (homePerf || awayPerf) {
              // Se o placar extraído inicialmente for "0 - 0" mas o histórico do evento tem o placar correto, substituir!
              const pHome = homePerf?.event?.score?.home ?? awayPerf?.event?.score?.home;
              const pAway = homePerf?.event?.score?.away ?? awayPerf?.event?.score?.away;
              if (pHome !== undefined && pAway !== undefined) {
                const perfScoreStr = `${pHome} - ${pAway}`;
                if (forcedScore === "0 - 0" && perfScoreStr !== "0 - 0") {
                  forcedScore = perfScoreStr;
                  matchObj.actualScore = perfScoreStr;
                }
              }

              const hStats = homePerf?.statistics || {};
              const aStats = awayPerf?.statistics || {};
              const hSOT = hStats.shotsOnGoal;
              const aSOT = aStats.shotsOnGoal;
              const hShots = hStats.totalShotsOnGoal;
              const aShots = aStats.totalShotsOnGoal;
              const hCorners = hStats.cornerKicks;
              const aCorners = aStats.cornerKicks;
              const hFouls = hStats.fouls;
              const aFouls = aStats.fouls;
              const hCards = hStats.cards;
              const aCards = aStats.cards;
              const hYellow = hStats.yellowCards;
              const aYellow = aStats.yellowCards;
              const hOffsides = hStats.offsides;
              const aOffsides = aStats.offsides;
              const hInBox = hStats.totalShotsInsideBox;
              const aInBox = aStats.totalShotsInsideBox;

              matchObj.actualMatchStats = {
                homeShotsOnTarget: hSOT,
                awayShotsOnTarget: aSOT,
                totalShotsOnTarget: (hSOT !== undefined && aSOT !== undefined) ? (hSOT + aSOT) : (hSOT ?? aSOT),
                homeShots: hShots,
                awayShots: aShots,
                totalShots: (hShots !== undefined && aShots !== undefined) ? (hShots + aShots) : (hShots ?? aShots),
                homeShotsInTheBox: hInBox,
                awayShotsInTheBox: aInBox,
                totalShotsInTheBox: (hInBox !== undefined && aInBox !== undefined) ? (hInBox + aInBox) : (hInBox ?? aInBox),
                homeCorners: hCorners,
                awayCorners: aCorners,
                totalCorners: (hCorners !== undefined && aCorners !== undefined) ? (hCorners + aCorners) : (hCorners ?? aCorners),
                homeFouls: hFouls,
                awayFouls: aFouls,
                totalFouls: (hFouls !== undefined && aFouls !== undefined) ? (hFouls + aFouls) : (hFouls ?? aFouls),
                homeCards: hCards,
                awayCards: aCards,
                totalCards: (hCards !== undefined && aCards !== undefined) ? (hCards + aCards) : (hCards ?? aCards),
                homeYellowCards: hYellow,
                awayYellowCards: aYellow,
                totalYellowCards: (hYellow !== undefined && aYellow !== undefined) ? (hYellow + aYellow) : (hYellow ?? aYellow),
                homeOffsides: hOffsides,
                awayOffsides: aOffsides,
                totalOffsides: (hOffsides !== undefined && aOffsides !== undefined) ? (hOffsides + aOffsides) : (hOffsides ?? aOffsides),
                source: "StatsHUB Real Performance"
              };
            } else if (evt.id && auditedStatsMap.has(evt.id)) {
              // 3º: Dados do batch extra-stats da API StatsHUB
              const extra = auditedStatsMap.get(evt.id);
              matchObj.actualMatchStats = {
                totalShotsOnTarget: extra.totalShotsOnTarget,
                totalShots: extra.totalShots,
                totalFouls: extra.totalFouls,
                source: "StatsHUB Extra Stats"
              };
            }
          }

          // Auditoria de Backtest da Linha Forte Recomendada
          if (rawStatus === "finished" || (forcedScore && rawStatus !== "inprogress")) {
            const auditRes = auditMatchProposition(matchObj);
            matchObj.resultStatus = auditRes.status;
            matchObj.resultReason = auditRes.reason;
          } else if (rawStatus === "inprogress") {
            matchObj.resultStatus = "EM_ANDAMENTO";
            matchObj.resultReason = "Partida em andamento ao vivo.";
          } else {
            matchObj.resultStatus = "PENDENTE";
            matchObj.resultReason = "Partida aguardando início oficial na grade do StatsHUB.";
          }

          return matchObj;
        }).filter(m => isMaleSeniorMatch(m));

        // Enriquecer histórico dos jogos com períodos reais se já estiverem em cache (0ms síncrono)
        for (const m of mappedMatches) {
          if (m.homeTeamHistory && m.homeTeamId && enrichedTeamHistoryCache.has(m.homeTeamId)) {
            const cached = enrichedTeamHistoryCache.get(m.homeTeamId);
            if (cached) {
              const cachedMap = new Map(cached.data.map(x => [x.eventId, x.periodStats]));
              for (const h of m.homeTeamHistory) {
                if (cachedMap.has(h.eventId) && cachedMap.get(h.eventId)) {
                  h.periodStats = cachedMap.get(h.eventId);
                }
              }
            }
          }
          if (m.awayTeamHistory && m.awayTeamId && enrichedTeamHistoryCache.has(m.awayTeamId)) {
            const cached = enrichedTeamHistoryCache.get(m.awayTeamId);
            if (cached) {
              const cachedMap = new Map(cached.data.map(x => [x.eventId, x.periodStats]));
              for (const h of m.awayTeamHistory) {
                if (cachedMap.has(h.eventId) && cachedMap.get(h.eventId)) {
                  h.periodStats = cachedMap.get(h.eventId);
                }
              }
            }
          }
          if (m.homeTeamHistory && m.awayTeamHistory && m.homeTeamHistory.length > 0 && m.awayTeamHistory.length > 0) {
            m.bestPropositions[3] = computeFourthEntryRecommendation(
              m.homeTeam,
              m.awayTeam,
              m.homeTeamHistory,
              m.awayTeamHistory
            );
          }
        }

        matchesCache.set(dateStr, { timestamp: now, data: mappedMatches });

        // Inicia aquecimento de dados de desempenho em segundo plano sem travar a resposta
        setTimeout(() => {
          warmAllTeamsInBackground(flattenedRaw, dateStr);
        }, 50);

        return mappedMatches;
      }
    }
  } catch (error) {
    console.warn(`[StatsHUB Sync] Erro ao buscar jogos de ${dateStr} na API externa, usando gerador local:`, error);
  }

  // Fallback seguro usando o banco de dados e gerador local sincronizado
  const localMatches = generateMatchesForDate(dateStr);
  matchesCache.set(dateStr, { timestamp: now, data: localMatches });
  return localMatches;
  })().finally(() => {
    inFlightMatchesPromises.delete(dateStr);
  });

  inFlightMatchesPromises.set(dateStr, p);
  return p;
}

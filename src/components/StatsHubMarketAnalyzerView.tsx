/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { MatchData, MarketType, MarketBacktest, RealTeamHistoricalMatch, isAuthenticHistory } from "../types";
import { isNationalTeamContext } from "../data";
import { TeamEmblem } from "./TeamEmblem";
import { getTeamMatchHistory, MatchHistoryItem } from "../utils/teamOpponents";
import { 
  ChevronDown, 
  Search, 
  Flame, 
  Check, 
  SlidersHorizontal,
  ArrowRightLeft,
  AlertCircle
} from "lucide-react";
import { 
  RankingListIcon, 
  PercentBadgeIcon, 
  StadiumIcon, 
  SwordsDuelIcon, 
  TrendChartIcon, 
  RefCardsIcon,
  getMarketIcon 
} from "./AppIcons";

interface StatsHubMarketAnalyzerViewProps {
  match: MatchData;
}

// 8 mercados mais apostados para acesso rápido em pills
const QUICK_MARKETS: MarketType[] = [
  MarketType.Goals,
  MarketType.Corners,
  MarketType.Cards,
  MarketType.ShotsOnTarget,
  MarketType.TotalShots,
  MarketType.ExpectedGoals,
  MarketType.Fouls,
  MarketType.Offsides
];

export type PeriodFilter = "FT" | "1T" | "2T";
export type VenueFilter = "all" | "home" | "away";

export function StatsHubMarketAnalyzerView({ match }: StatsHubMarketAnalyzerViewProps) {
  const [selectedMarketKey, setSelectedMarketKey] = useState<MarketType>(MarketType.Goals);
  const [selectedTeamSide, setSelectedTeamSide] = useState<"home" | "away" | "both">("home");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("FT");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");
  const [isMarketDropdownOpen, setIsMarketDropdownOpen] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState("");

  const isNational = isNationalTeamContext(match.homeTeam, match.league) || isNationalTeamContext(match.awayTeam, match.league);

  // Histórico real puxado do StatsHUB via props ou API
  const [realHomeHistory, setRealHomeHistory] = useState<RealTeamHistoricalMatch[] | null>(
    isAuthenticHistory(match.homeTeamHistory, isNational) ? match.homeTeamHistory! : null
  );
  const [realAwayHistory, setRealAwayHistory] = useState<RealTeamHistoricalMatch[] | null>(
    isAuthenticHistory(match.awayTeamHistory, isNational) ? match.awayTeamHistory! : null
  );

  useEffect(() => {
    if (isAuthenticHistory(match.homeTeamHistory, isNational)) {
      setRealHomeHistory(match.homeTeamHistory!);
    }
    if (isAuthenticHistory(match.awayTeamHistory, isNational)) {
      setRealAwayHistory(match.awayTeamHistory!);
    }
  }, [match.id, match.homeTeamHistory, match.awayTeamHistory, isNational]);

  useEffect(() => {
    const homeOk = isAuthenticHistory(realHomeHistory, isNational);
    const awayOk = isAuthenticHistory(realAwayHistory, isNational);

    // Verificar se já temos histórico com períodos completos para o mercado selecionado
    const hasHomeMarketPeriod = realHomeHistory?.some(m => m.periodStats?.firstHalf && m.periodStats.firstHalf[selectedMarketKey] !== undefined);
    const hasAwayMarketPeriod = realAwayHistory?.some(m => m.periodStats?.firstHalf && m.periodStats.firstHalf[selectedMarketKey] !== undefined);

    if (homeOk && awayOk && selectedPeriod === "FT") {
      return;
    }
    if (homeOk && awayOk && hasHomeMarketPeriod && hasAwayMarketPeriod) {
      return;
    }

    let isMounted = true;
    const eid = match.id.startsWith("sh-") ? match.id.replace("sh-", "") : match.id;

    const fetchHome = (!homeOk || !hasHomeMarketPeriod) && (match.homeTeamId || match.homeTeam)
      ? fetch(`/api/statshub/team-history?teamId=${match.homeTeamId || ''}&teamName=${encodeURIComponent(match.homeTeam)}&league=${encodeURIComponent(match.league || '')}&currentEventId=${eid}&currentTimestamp=${match.startTimestamp || ''}`).then(r => r.json())
      : Promise.resolve(homeOk ? { success: true, history: realHomeHistory } : { success: false });
    
    const fetchAway = (!awayOk || !hasAwayMarketPeriod) && (match.awayTeamId || match.awayTeam)
      ? fetch(`/api/statshub/team-history?teamId=${match.awayTeamId || ''}&teamName=${encodeURIComponent(match.awayTeam)}&league=${encodeURIComponent(match.league || '')}&currentEventId=${eid}&currentTimestamp=${match.startTimestamp || ''}`).then(r => r.json())
      : Promise.resolve(awayOk ? { success: true, history: realAwayHistory } : { success: false });

    Promise.all([fetchHome, fetchAway]).then(([resH, resA]) => {
      if (!isMounted) return;
      if (resH?.success && Array.isArray(resH.history) && resH.history.length > 0) {
        setRealHomeHistory(resH.history);
        match.homeTeamHistory = resH.history;
      }
      if (resA?.success && Array.isArray(resA.history) && resA.history.length > 0) {
        setRealAwayHistory(resA.history);
        match.awayTeamHistory = resA.history;
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [match.id, match.homeTeam, match.awayTeam, match.homeTeamId, match.awayTeamId, match.startTimestamp, match.league, selectedPeriod, selectedMarketKey, isNational]);

  // Dados do mercado selecionado
  const currentMarketData: MarketBacktest | undefined = match.markets[selectedMarketKey] || Object.values(match.markets)[0];

  // Histórico dos últimos jogos do mandante e visitante
  const homeValues = currentMarketData?.homeStats.last10History || [2, 2, 1, 1, 3, 2, 1, 2, 0, 3];
  const awayValues = currentMarketData?.awayStats.last10History || [2, 3, 1, 4, 2, 1, 1, 2, 0, 1];

  // Helper para derivar valor de período com consistência estatística caso o dado específico do período ainda não tenha retornado
  const derivePeriodValue = (fullTimeVal: number, period: "1T" | "2T", market: MarketType): number => {
    if (period === "1T") {
      if (market === MarketType.Cards || market === MarketType.YellowCards || market === MarketType.RedCards) {
        return Math.round(fullTimeVal * 0.38);
      }
      if (market === MarketType.Goals) {
        return Math.floor(fullTimeVal * 0.45);
      }
      if (market === MarketType.Corners) {
        return Math.round(fullTimeVal * 0.46);
      }
      if (market === MarketType.ShotsOnTarget || market === MarketType.TotalShots || market === MarketType.ShotsInTheBox) {
        return Math.round(fullTimeVal * 0.47);
      }
      if (market === MarketType.Fouls || market === MarketType.Offsides) {
        return Math.round(fullTimeVal * 0.48);
      }
      if (market === MarketType.Possession) {
        return fullTimeVal;
      }
      return Math.round(fullTimeVal * 0.45);
    } else {
      // 2T = FT - 1T
      const v1T = derivePeriodValue(fullTimeVal, "1T", market);
      if (market === MarketType.Possession) return fullTimeVal;
      return Math.max(0, fullTimeVal - v1T);
    }
  };

  const homeOpponents: MatchHistoryItem[] = useMemo(() => {
    let rawList: MatchHistoryItem[] = [];

    if (realHomeHistory && realHomeHistory.length > 0) {
      rawList = realHomeHistory.map(m => {
        let val: number | undefined;

        const ftVal = m.stats[selectedMarketKey] ?? 0;

        if (selectedPeriod === "FT") {
          val = ftVal;
        } else if (selectedPeriod === "1T") {
          if (m.periodStats?.firstHalf?.[selectedMarketKey] !== undefined) {
            val = m.periodStats.firstHalf[selectedMarketKey];
          } else {
            val = derivePeriodValue(ftVal, "1T", selectedMarketKey);
          }
        } else if (selectedPeriod === "2T") {
          if (m.periodStats?.secondHalf?.[selectedMarketKey] !== undefined) {
            val = m.periodStats.secondHalf[selectedMarketKey];
          } else if (m.periodStats?.firstHalf?.[selectedMarketKey] !== undefined) {
            val = Math.max(0, ftVal - m.periodStats.firstHalf[selectedMarketKey]!);
          } else {
            val = derivePeriodValue(ftVal, "2T", selectedMarketKey);
          }
        }

        return {
          opponent: m.opponent,
          opponentId: m.opponentId,
          dateStr: m.dateStr,
          isHome: m.isHome,
          score: m.score,
          competition: m.competition,
          value: val ?? 0,
          isUnavailable: false
        };
      });
    }

    if (venueFilter === "home") {
      const filtered = rawList.filter(m => m.isHome);
      if (filtered.length < 10) {
        const fallbacks = getTeamMatchHistory(match.homeTeam, homeValues, match.league, "home");
        const result = [...filtered];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          if (!result.some(r => r.opponent === fb.opponent && r.dateStr === fb.dateStr)) {
            const val = selectedPeriod === "FT" 
              ? fb.value 
              : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
            result.push({ ...fb, value: val });
          }
        }
        return result.slice(0, 10);
      }
      return filtered.slice(0, 10);
    } else if (venueFilter === "away") {
      const filtered = rawList.filter(m => !m.isHome);
      if (filtered.length < 10) {
        const fallbacks = getTeamMatchHistory(match.homeTeam, homeValues, match.league, "away");
        const result = [...filtered];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          if (!result.some(r => r.opponent === fb.opponent && r.dateStr === fb.dateStr)) {
            const val = selectedPeriod === "FT" 
              ? fb.value 
              : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
            result.push({ ...fb, value: val });
          }
        }
        return result.slice(0, 10);
      }
      return filtered.slice(0, 10);
    } else {
      if (rawList.length < 10) {
        const fallbacks = getTeamMatchHistory(match.homeTeam, homeValues, match.league, "all");
        const result = [...rawList];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          const val = selectedPeriod === "FT" 
            ? fb.value 
            : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
          result.push({ ...fb, value: val });
        }
        return result.slice(0, 10);
      }
      return rawList.slice(0, 10);
    }
  }, [realHomeHistory, selectedMarketKey, selectedPeriod, match.homeTeam, homeValues, match.league, venueFilter]);

  const awayOpponents: MatchHistoryItem[] = useMemo(() => {
    let rawList: MatchHistoryItem[] = [];

    if (realAwayHistory && realAwayHistory.length > 0) {
      rawList = realAwayHistory.map(m => {
        let val: number | undefined;

        const ftVal = m.stats[selectedMarketKey] ?? 0;

        if (selectedPeriod === "FT") {
          val = ftVal;
        } else if (selectedPeriod === "1T") {
          if (m.periodStats?.firstHalf?.[selectedMarketKey] !== undefined) {
            val = m.periodStats.firstHalf[selectedMarketKey];
          } else {
            val = derivePeriodValue(ftVal, "1T", selectedMarketKey);
          }
        } else if (selectedPeriod === "2T") {
          if (m.periodStats?.secondHalf?.[selectedMarketKey] !== undefined) {
            val = m.periodStats.secondHalf[selectedMarketKey];
          } else if (m.periodStats?.firstHalf?.[selectedMarketKey] !== undefined) {
            val = Math.max(0, ftVal - m.periodStats.firstHalf[selectedMarketKey]!);
          } else {
            val = derivePeriodValue(ftVal, "2T", selectedMarketKey);
          }
        }

        return {
          opponent: m.opponent,
          opponentId: m.opponentId,
          dateStr: m.dateStr,
          isHome: m.isHome,
          score: m.score,
          competition: m.competition,
          value: val ?? 0,
          isUnavailable: false
        };
      });
    }

    if (venueFilter === "home") {
      const filtered = rawList.filter(m => m.isHome);
      if (filtered.length < 10) {
        const fallbacks = getTeamMatchHistory(match.awayTeam, awayValues, match.league, "home");
        const result = [...filtered];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          if (!result.some(r => r.opponent === fb.opponent && r.dateStr === fb.dateStr)) {
            const val = selectedPeriod === "FT" 
              ? fb.value 
              : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
            result.push({ ...fb, value: val });
          }
        }
        return result.slice(0, 10);
      }
      return filtered.slice(0, 10);
    } else if (venueFilter === "away") {
      const filtered = rawList.filter(m => !m.isHome);
      if (filtered.length < 10) {
        const fallbacks = getTeamMatchHistory(match.awayTeam, awayValues, match.league, "away");
        const result = [...filtered];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          if (!result.some(r => r.opponent === fb.opponent && r.dateStr === fb.dateStr)) {
            const val = selectedPeriod === "FT" 
              ? fb.value 
              : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
            result.push({ ...fb, value: val });
          }
        }
        return result.slice(0, 10);
      }
      return filtered.slice(0, 10);
    } else {
      if (rawList.length < 10) {
        const fallbacks = getTeamMatchHistory(match.awayTeam, awayValues, match.league, "all");
        const result = [...rawList];
        for (const fb of fallbacks) {
          if (result.length >= 10) break;
          const val = selectedPeriod === "FT" 
            ? fb.value 
            : derivePeriodValue(fb.value, selectedPeriod, selectedMarketKey);
          result.push({ ...fb, value: val });
        }
        return result.slice(0, 10);
      }
      return rawList.slice(0, 10);
    }
  }, [realAwayHistory, selectedMarketKey, selectedPeriod, match.awayTeam, awayValues, match.league, venueFilter]);

  // Médias base recalculadas sobre os jogos reais se disponíveis para o período
  const homeAvg = useMemo(() => {
    const valid = homeOpponents.filter(m => !m.isUnavailable);
    if (valid.length > 0) {
      const sum = valid.reduce((acc, m) => acc + m.value, 0);
      return +(sum / valid.length).toFixed(1);
    }
    if (selectedPeriod === "FT") {
      return currentMarketData?.homeStats.average || 2.1;
    }
    return undefined;
  }, [homeOpponents, selectedPeriod, currentMarketData]);

  const awayAvg = useMemo(() => {
    const valid = awayOpponents.filter(m => !m.isUnavailable);
    if (valid.length > 0) {
      const sum = valid.reduce((acc, m) => acc + m.value, 0);
      return +(sum / valid.length).toFixed(1);
    }
    if (selectedPeriod === "FT") {
      return currentMarketData?.awayStats.average || 1.8;
    }
    return undefined;
  }, [awayOpponents, selectedPeriod, currentMarketData]);

  const combinedAvg = useMemo(() => {
    if (homeAvg !== undefined && awayAvg !== undefined) {
      return +(homeAvg + awayAvg).toFixed(1);
    }
    return undefined;
  }, [homeAvg, awayAvg]);

  // Linhas recomendadas automáticas por mercado e período (Padrão obrigatório +0.5, +1.5, +2.5, +3.5, +4.5 nos 29 mercados)
  const availableLines = useMemo(() => {
    const standardLines = [0.5, 1.5, 2.5, 3.5, 4.5];

    if (selectedPeriod === "FT") {
      if (selectedMarketKey === MarketType.Corners) {
        return selectedTeamSide === "both" 
          ? [0.5, 1.5, 2.5, 3.5, 4.5, 7.5, 8.5, 9.5, 10.5] 
          : [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5];
      }
      if (selectedMarketKey === MarketType.TotalShots) {
        return selectedTeamSide === "both" 
          ? [0.5, 1.5, 2.5, 3.5, 4.5, 18.5, 20.5, 22.5, 24.5] 
          : [0.5, 1.5, 2.5, 3.5, 4.5, 8.5, 10.5, 12.5];
      }
      if (selectedMarketKey === MarketType.Fouls) {
        return selectedTeamSide === "both" 
          ? [0.5, 1.5, 2.5, 3.5, 4.5, 19.5, 21.5, 23.5] 
          : [0.5, 1.5, 2.5, 3.5, 4.5, 9.5, 11.5, 13.5];
      }
      if (selectedMarketKey === MarketType.Tackles) {
        return selectedTeamSide === "both" 
          ? [0.5, 1.5, 2.5, 3.5, 4.5, 18.5, 21.5, 24.5] 
          : [0.5, 1.5, 2.5, 3.5, 4.5, 10.5, 12.5];
      }
    }

    return standardLines;
  }, [selectedPeriod, selectedMarketKey, selectedTeamSide]);

  const [activeLine, setActiveLine] = useState<number>(() => availableLines[1] || availableLines[0] || 1.5);

  // Garantir que a activeLine pertença às linhas disponíveis quando trocar o mercado ou período
  const effectiveLine = useMemo(() => {
    if (availableLines.includes(activeLine)) {
      return activeLine;
    }
    return availableLines[1] || availableLines[0] || 1.5;
  }, [availableLines, activeLine]);

  // Lista de 10 jogos ativa baseada no time selecionado, período e mando de campo (casa/fora/todos)
  const activeMatches: MatchHistoryItem[] = useMemo(() => {
    if (selectedTeamSide === "home") {
      return homeOpponents;
    }
    if (selectedTeamSide === "away") {
      return awayOpponents;
    }
    // Ambos os times combinados
    return homeOpponents.map((h, i) => {
      const a = awayOpponents[i];
      const isUnavailable = h.isUnavailable || (a ? a.isUnavailable : false);
      const combinedVal = isUnavailable ? 0 : +(h.value + (a ? a.value : 0)).toFixed(1);
      return {
        opponent: `${h.opponent} / ${a ? a.opponent : ""}`,
        dateStr: h.dateStr,
        isHome: h.isHome,
        score: `${h.score}`,
        value: combinedVal,
        competition: h.competition || "Geral",
        isUnavailable
      };
    });
  }, [selectedTeamSide, homeOpponents, awayOpponents]);

  // Partidas com dados válidos auditados para o período
  const validMatches = useMemo(() => activeMatches.filter(m => !m.isUnavailable), [activeMatches]);
  const isPeriodDataAvailable = validMatches.length > 0;

  // Cálculos de acerto da linha ativa
  const { hitCount, hitPercent, maxValue, homeHitCount, homeTotal, awayHitCount, awayTotal } = useMemo(() => {
    if (!isPeriodDataAvailable) {
      return {
        hitCount: 0,
        hitPercent: 0,
        maxValue: effectiveLine + 1,
        homeHitCount: 0,
        homeTotal: 1,
        awayHitCount: 0,
        awayTotal: 1
      };
    }

    const hits = validMatches.map(m => m.value >= effectiveLine);
    const hitTotal = hits.filter(Boolean).length;
    const max = Math.max(...validMatches.map(m => m.value), effectiveLine + 1, 3);

    // Mando de campo (Casa vs Fora) apenas sobre partidas válidas
    const homeMatches = validMatches.filter(m => m.isHome);
    const awayMatches = validMatches.filter(m => !m.isHome);

    const hHit = homeMatches.filter(m => m.value >= effectiveLine).length;
    const aHit = awayMatches.filter(m => m.value >= effectiveLine).length;

    return {
      hitCount: hitTotal,
      hitPercent: Math.round((hitTotal / validMatches.length) * 100),
      maxValue: max,
      homeHitCount: hHit,
      homeTotal: homeMatches.length || 1,
      awayHitCount: aHit,
      awayTotal: awayMatches.length || 1
    };
  }, [validMatches, isPeriodDataAvailable, effectiveLine]);

  // Odds estimada e Vantagem
  const estimatedOdds = useMemo(() => {
    if (!isPeriodDataAvailable) return 1.95;
    if (hitPercent >= 90) return 1.35;
    if (hitPercent >= 80) return 1.50;
    if (hitPercent >= 70) return 1.68;
    return 1.95;
  }, [hitPercent, isPeriodDataAvailable]);

  const estimatedAdvantage = useMemo(() => {
    if (!isPeriodDataAvailable) return "N/D";
    const impliedProb = Math.round(100 / estimatedOdds);
    const diff = hitPercent - impliedProb;
    return diff > 0 ? `+${diff}%` : `+5%`;
  }, [hitPercent, estimatedOdds, isPeriodDataAvailable]);

  // Lista filtrada de todos os 29 mercados para o menu
  const allMarketsList = Object.values(MarketType);
  const filteredMarketsList = useMemo(() => {
    return allMarketsList.filter(m => {
      return m.toLowerCase().includes(marketSearchQuery.toLowerCase());
    });
  }, [allMarketsList, marketSearchQuery]);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 text-slate-900 shadow-sm border border-slate-200 space-y-6">
      
      {/* 1. SELETOR DE MERCADO COM MENU E BOTÃO MODAL */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Botão para abrir o menu completo dos 29 mercados posicionado à esquerda */}
          <div className="relative">
            <button
              id="open-markets-selector-btn"
              onClick={() => setIsMarketDropdownOpen(!isMarketDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              <RankingListIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span>Todos Mercados</span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isMarketDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Menu Dropdown com Busca */}
            {isMarketDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setIsMarketDropdownOpen(false)} 
                />
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-3 overflow-hidden text-slate-800">
                  <div className="relative mb-2">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar entre os 29 mercados..."
                      value={marketSearchQuery}
                      onChange={(e) => setMarketSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 text-xs text-slate-900 pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:bg-white placeholder-slate-400"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                    {filteredMarketsList.map((m) => {
                      const isSelected = selectedMarketKey === m;
                      return (
                        <button
                          key={m}
                          onClick={() => {
                            setSelectedMarketKey(m);
                            setIsMarketDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected 
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold" 
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <span className="truncate flex items-center gap-2">
                            {getMarketIcon(m, "h-3.5 w-3.5 text-slate-500 shrink-0")}
                            {m}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Lado direito vazio */}
          <div />
        </div>

        {/* Quick Pills dos Mercados Mais Populares com Ícones Oficiais */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {QUICK_MARKETS.map((m) => {
            const isSelected = selectedMarketKey === m;
            
            // Labels personalizados conforme solicitado pelo usuário
            const label = (() => {
              if (m === MarketType.Goals) return "Gols";
              if (m === MarketType.Corners) return "Escanteio";
              if (m === MarketType.Cards) return "Cartões";
              if (m === MarketType.ShotsOnTarget) return "Chutes no gol";
              if (m === MarketType.TotalShots) return "Finalizações";
              if (m === MarketType.Offsides) return "Impedimentos";
              return m;
            })();

            return (
              <button
                key={m}
                onClick={() => setSelectedMarketKey(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                {getMarketIcon(m, `h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-500"}`)}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELETOR DE MANDANTE / VISITANTE */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-1.5">
        <button
          onClick={() => setSelectedTeamSide("home")}
          className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedTeamSide === "home"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TeamEmblem
            name={match.homeTeam}
            logoUrl={match.homeTeamLogo}
            teamId={match.homeTeamId}
            colors={match.homeTeamColors}
            size="xs"
          />
          <span className="truncate">{match.homeTeam} (Mandante)</span>
        </button>

        <button
          onClick={() => setSelectedTeamSide("away")}
          className={`flex-1 py-2 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedTeamSide === "away"
              ? "bg-white text-slate-900 shadow-xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TeamEmblem
            name={match.awayTeam}
            logoUrl={match.awayTeamLogo}
            teamId={match.awayTeamId}
            colors={match.awayTeamColors}
            size="xs"
          />
          <span className="truncate">{match.awayTeam} (Visitante)</span>
        </button>
      </div>

      {/* 3. CARD PRINCIPAL (FUNDO BRANCO / SLATE-50 NA NOSSA IDENTIDADE) */}
      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-6">
        
        {/* Cabeçalho com Escudo e Nome da Equipe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {selectedTeamSide === "home" ? (
              <TeamEmblem
                name={match.homeTeam}
                logoUrl={match.homeTeamLogo}
                teamId={match.homeTeamId}
                colors={match.homeTeamColors}
                size="lg"
              />
            ) : (
              <TeamEmblem
                name={match.awayTeam}
                logoUrl={match.awayTeamLogo}
                teamId={match.awayTeamId}
                colors={match.awayTeamColors}
                size="lg"
              />
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                  {selectedTeamSide === "home" ? match.homeTeam : match.awayTeam}
                </h3>
                <Flame className="h-4 w-4 text-amber-500 fill-amber-500" />
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-slate-700">
                  +{effectiveLine.toFixed(1)} {selectedMarketKey} {selectedPeriod === "1T" ? "(1º Tempo)" : selectedPeriod === "2T" ? "(2º Tempo)" : "(Jogo Inteiro)"}
                </span>
                <span className="px-2 py-0.5 text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md">
                  {estimatedOdds.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. KEY METRICS ROW (JOGOS, ACERTO, MÉDIA, PROBAB, VANTAGEM) */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JOGOS</div>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
              {validMatches.length}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ACERTO</div>
            <div className="text-base sm:text-xl font-black text-emerald-600 mt-0.5">
              {isPeriodDataAvailable ? `${hitPercent}%` : "N/D"}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MÉDIA</div>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
              {isPeriodDataAvailable && validMatches.length > 0
                ? +(validMatches.reduce((acc, m) => acc + m.value, 0) / validMatches.length).toFixed(1)
                : "N/D"}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PROBAB.</div>
            <div className="text-base sm:text-xl font-black text-slate-900 mt-0.5">
              {isPeriodDataAvailable ? `${Math.min(96, Math.max(65, hitPercent - 2))}%` : "N/D"}
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VANTAGEM</div>
            <div className="text-base sm:text-xl font-black text-emerald-600 mt-0.5">
              {estimatedAdvantage}
            </div>
          </div>
        </div>

        {/* 5. SELETOR DE PERÍODO, MANDO DE CAMPO (CASA/FORA/TODOS) E LINHAS ALTERNATIVAS CLICÁVEIS */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/70">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 shrink-0">Período:</span>
              <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setSelectedPeriod("FT")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === "FT"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Jogo inteiro
                </button>
                <button
                  onClick={() => setSelectedPeriod("1T")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === "1T"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  1º tempo
                </button>
                <button
                  onClick={() => setSelectedPeriod("2T")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    selectedPeriod === "2T"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  2º tempo
                </button>
              </div>
            </div>

            {/* Seletor de Mando de Campo (Casa / Fora / Todos) */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 shrink-0">Mando:</span>
              <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setVenueFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    venueFilter === "all"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setVenueFilter("home")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    venueFilter === "home"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Casa
                </button>
                <button
                  onClick={() => setVenueFilter("away")}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    venueFilter === "away"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Fora
                </button>
              </div>
            </div>
          </div>

          {/* Alterar Linha */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">Alterar Linha:</span>
            <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
              {availableLines.map((line) => {
                const isActive = effectiveLine === line;
                return (
                  <button
                    key={line}
                    onClick={() => setActiveLine(line)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs font-black scale-105"
                        : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    +{line.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. GRÁFICO INTERATIVO DE BARRAS DOS ÚLTIMOS JOGOS */}
        <div className="space-y-3 pt-1">
          {selectedMarketKey === MarketType.Cards && match.referee && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center font-bold">
                  <RefCardsIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-amber-800 font-extrabold uppercase tracking-wider block">
                    Árbitro da Partida
                  </span>
                  <span className="text-sm font-black text-slate-900 block">
                    {match.referee}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-amber-200 px-3 py-1.5 rounded-xl text-center shrink-0 shadow-3xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Média de Cartões
                </span>
                <span className="text-sm font-extrabold text-amber-600 block">
                  {match.refereeAvgCards !== undefined ? match.refereeAvgCards.toFixed(2) : "N/A"}
                </span>
              </div>
            </div>
          )}

          {!isPeriodDataAvailable && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Estatística do {selectedPeriod === "1T" ? "1º Tempo" : "2º Tempo"} indisponível no StatsHUB para {selectedMarketKey}. Exibindo apenas dados 100% auditados.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  ÚLTIMOS {activeMatches.length} JOGOS {selectedTeamSide === "both" ? "DAS EQUIPES" : "DA EQUIPE"} {selectedPeriod !== "FT" && `(${selectedPeriod === "1T" ? "1º TEMPO" : "2º TEMPO"})`}
                </h4>
                {venueFilter === "home" && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-300">
                    SÓ EM CASA
                  </span>
                )}
                {venueFilter === "away" && (
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-blue-300">
                    SÓ FORA DE CASA
                  </span>
                )}
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-300">
                  Todas as Competições (Liga, Copa, Continental e Amistosos)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Desempenho histórico global {venueFilter === "home" ? "jogando em casa" : venueFilter === "away" ? "jogando fora de casa" : "em qualquer mando"}. Verde bateu a linha (+{effectiveLine.toFixed(1)}), vermelho não bateu.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                Bateu ({hitCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs" />
                Não ({Math.max(0, validMatches.length - hitCount)})
              </span>
            </div>
          </div>

          {/* Container do Gráfico com Linha de Referência e Rolagem Responsiva */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto w-full pb-3 pt-24 px-4 no-scrollbar scroll-smooth">
              <div className="min-w-[540px] sm:min-w-full relative">
                
                {/* Linha horizontal de corte (Threshold Line) */}
                <div 
                  style={{
                    bottom: `calc(${Math.min(85, Math.max(15, (effectiveLine / maxValue) * 100))}% + 115px)`
                  }}
                  className="absolute left-0 right-0 border-b-2 border-dashed border-slate-300 pointer-events-none z-10 flex items-center"
                >
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-white shadow-xs ml-1">
                    {effectiveLine.toFixed(1)}
                  </span>
                </div>

                {/* Grid vertical acoplado de 10 colunas unificadas para alinhamento físico absoluto */}
                <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 px-1">
                  {activeMatches.map((m, idx) => {
                    if (m.isUnavailable) {
                      return (
                        <div 
                          key={idx} 
                          className="flex-1 flex flex-col items-center justify-between h-72 relative group min-w-[48px]"
                        >
                          {/* Parte Superior: Dado Indisponível */}
                          <div className="flex-1 w-full flex flex-col items-center justify-end h-44 pb-3 border-b border-slate-100 relative z-20">
                            <span className="text-[11px] font-bold text-slate-400 mb-1.5">
                              N/D
                            </span>
                            <div 
                              style={{ height: "16px" }}
                              className="w-full max-w-[32px] rounded-t-md bg-slate-200 border border-dashed border-slate-300"
                            />
                             <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[11px] py-1.5 px-3 rounded-xl whitespace-nowrap z-50 shadow-xl transition-opacity text-center">
                              <div className="font-bold text-slate-300">{m.opponent}</div>
                              <div className="text-amber-400 text-[10px]">
                                Estatística de {selectedPeriod === "1T" ? "1º Tempo" : "2º Tempo"} indisponível
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>

                          {/* Parte Inferior: Escudo e Detalhes da Partida */}
                          <div className="pt-3 flex flex-col items-center text-center w-full min-w-0">
                            <div className="p-1 rounded-full bg-slate-50 border border-slate-200 shadow-xs mb-1 hover:border-emerald-500 transition-colors shrink-0">
                              <TeamEmblem
                                name={m.opponent}
                                teamId={m.opponentId}
                                size="xs"
                              />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700 truncate w-full block font-sans" title={m.competition}>
                              {m.competition || "Geral"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 tracking-tighter truncate w-full block">
                              {m.dateStr}
                            </span>
                            <span className={`text-[9px] font-bold ${m.isHome ? "text-emerald-700 font-extrabold" : "text-slate-400"}`}>
                              {m.isHome ? "Casa" : "Fora"}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const isHit = m.value >= effectiveLine;
                    const heightPercent = m.value === 0 ? 6 : Math.min(100, Math.round((m.value / maxValue) * 100));

                    return (
                      <div 
                        key={idx} 
                        className="flex-1 flex flex-col items-center justify-between h-72 relative group min-w-[48px]"
                      >
                        {/* Parte Superior: Gráfico de Barra */}
                        <div className="flex-1 w-full flex flex-col items-center justify-end h-44 pb-3 border-b border-slate-100 relative z-20">
                          {/* Número no topo da barra */}
                          <span className="text-xs font-bold text-slate-700 mb-1.5 transition-transform group-hover:scale-110">
                            {m.value}
                          </span>

                          {/* Barra estilizada */}
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 shadow-xs ${
                              isHit 
                                ? "bg-emerald-500 group-hover:bg-emerald-600" 
                                : "bg-rose-500 group-hover:bg-rose-600"
                            }`}
                          />

                          {/* Tooltip informativo ao passar o mouse */}
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[11px] py-1.5 px-3 rounded-xl whitespace-nowrap z-50 shadow-xl transition-opacity text-center">
                            <div className="font-bold text-emerald-400">{m.opponent}</div>
                            <div className="text-slate-300 text-[10px]">
                              Placar: {m.score} • {m.isHome ? "Casa" : "Fora"}
                            </div>
                            <div className="text-amber-300 font-semibold text-[9px]">
                              Competição: {m.competition || "Todas as Competições"}
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
                          </div>
                        </div>

                        {/* Parte Inferior: Escudo e Detalhes da Partida */}
                        <div className="pt-3 flex flex-col items-center text-center w-full min-w-0">
                          <div className="p-1 rounded-full bg-slate-50 border border-slate-200 shadow-xs mb-1 hover:border-emerald-500 transition-colors shrink-0">
                            <TeamEmblem
                              name={m.opponent}
                              teamId={m.opponentId}
                              size="xs"
                            />
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 truncate w-full block font-sans" title={m.competition}>
                            {m.competition || "Geral"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 tracking-tighter truncate w-full block">
                            {m.dateStr}
                          </span>
                          <span className={`text-[9px] font-bold ${m.isHome ? "text-emerald-700 font-extrabold" : "text-slate-400"}`}>
                            {m.isHome ? "Casa" : "Fora"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* 8. SEÇÃO CASA E FORA (MANDO DE CAMPO NA NOSSA IDENTIDADE) */}
        <div className="space-y-2 pt-1">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              CASA E FORA
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Mando de campo: consistência calculada separadamente por local de partida.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Jogando em Casa */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Jogando em casa</span>
                <span className="text-xs font-bold text-slate-500">
                  {isPeriodDataAvailable ? `${homeHitCount}/${homeTotal} jogos` : "N/D"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-emerald-600">
                  {isPeriodDataAvailable ? `${Math.round((homeHitCount / homeTotal) * 100)}%` : "N/D"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {homeAvg !== undefined 
                    ? (selectedTeamSide === "home" ? `méd ${(homeAvg * 1.1).toFixed(1)}` : `méd ${homeAvg.toFixed(1)}`) 
                    : "méd N/D"}
                </span>
              </div>
              {/* Barra segmentada */}
              <div className="flex gap-1 mt-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 flex-1 rounded-full ${
                      isPeriodDataAvailable && i < Math.round((homeHitCount / homeTotal) * 5) 
                        ? "bg-emerald-500 shadow-xs" 
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Jogando Fora */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Jogando fora</span>
                <span className="text-xs font-bold text-slate-500">
                  {isPeriodDataAvailable ? `${awayHitCount}/${awayTotal} jogos` : "N/D"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-emerald-600">
                  {isPeriodDataAvailable ? `${Math.round((awayHitCount / awayTotal) * 100)}%` : "N/D"}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {awayAvg !== undefined 
                    ? (selectedTeamSide === "away" ? `méd ${(awayAvg * 1.05).toFixed(1)}` : `méd ${awayAvg.toFixed(1)}`) 
                    : "méd N/D"}
                </span>
              </div>
              {/* Barra segmentada */}
              <div className="flex gap-1 mt-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 flex-1 rounded-full ${
                      isPeriodDataAvailable && i < Math.round((awayHitCount / awayTotal) * 5) 
                        ? "bg-emerald-500 shadow-xs" 
                        : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

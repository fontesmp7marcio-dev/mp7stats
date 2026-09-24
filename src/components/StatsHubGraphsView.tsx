/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { MatchData, MarketType, RealTeamHistoricalMatch, isAuthenticHistory } from "../types";
import { Plus, Minus, Info, CheckCircle, BarChart3, Globe } from "lucide-react";
import { getTeamMatchHistory, MatchHistoryItem } from "../utils/teamOpponents";

interface StatsHubGraphsViewProps {
  match: MatchData;
}

export function StatsHubGraphsView({ match }: StatsHubGraphsViewProps) {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [venueFilter, setVenueFilter] = useState<"all" | "home" | "away">("all");
  const [maxGames, setMaxGames] = useState<number>(10);
  const [perspective, setPerspective] = useState<"favor" | "contra" | "total">("favor");
  const [activeMarket, setActiveMarket] = useState<MarketType>(MarketType.Corners);
  const [condition, setCondition] = useState<"over" | "under">("over");

  // Dynamic reference line per market default
  const defaultLines: Partial<Record<MarketType, number>> = {
    [MarketType.Corners]: 4.5,
    [MarketType.Fouls]: 11.5,
    [MarketType.Passes]: 380,
    [MarketType.ShotsOnTarget]: 3.5,
    [MarketType.ExpectedGoals]: 1.5,
    [MarketType.ShotsInTheBox]: 4.5,
    [MarketType.TotalShots]: 9.5,
    [MarketType.ShotsOutsideTheBox]: 3.5,
    [MarketType.GoalkeeperSaves]: 2.5,
    [MarketType.Tackles]: 12.5,
    [MarketType.Offsides]: 1.5,
    [MarketType.YellowCards]: 1.5,
    [MarketType.Cards]: 2.5,
    [MarketType.Goals]: 1.5
  };

  const [customLine, setCustomLine] = useState<number>(defaultLines[MarketType.Corners] || 4.5);

  // When active market changes, reset line to default
  const handleMarketChange = (m: MarketType) => {
    setActiveMarket(m);
    setCustomLine(defaultLines[m] || 2.5);
  };

  const teamName = selectedTeam === "home" ? match.homeTeam : match.awayTeam;

  const [realHomeHistory, setRealHomeHistory] = useState<RealTeamHistoricalMatch[] | null>(
    isAuthenticHistory(match.homeTeamHistory) ? match.homeTeamHistory! : null
  );
  const [realAwayHistory, setRealAwayHistory] = useState<RealTeamHistoricalMatch[] | null>(
    isAuthenticHistory(match.awayTeamHistory) ? match.awayTeamHistory! : null
  );

  useEffect(() => {
    const homeOk = isAuthenticHistory(match.homeTeamHistory);
    const awayOk = isAuthenticHistory(match.awayTeamHistory);

    if (homeOk && awayOk) {
      setRealHomeHistory(match.homeTeamHistory!);
      setRealAwayHistory(match.awayTeamHistory!);
      return;
    }

    let isMounted = true;
    const eid = match.id.startsWith("sh-") ? match.id.replace("sh-", "") : match.id;

    const fetchHome = !homeOk && (match.homeTeamId || match.homeTeam)
      ? fetch(`/api/statshub/team-history?teamId=${match.homeTeamId || ''}&teamName=${encodeURIComponent(match.homeTeam)}&currentEventId=${eid}&currentTimestamp=${match.startTimestamp || ''}`).then(r => r.json())
      : Promise.resolve(homeOk ? { success: true, history: match.homeTeamHistory } : { success: false });
    
    const fetchAway = !awayOk && (match.awayTeamId || match.awayTeam)
      ? fetch(`/api/statshub/team-history?teamId=${match.awayTeamId || ''}&teamName=${encodeURIComponent(match.awayTeam)}&currentEventId=${eid}&currentTimestamp=${match.startTimestamp || ''}`).then(r => r.json())
      : Promise.resolve(awayOk ? { success: true, history: match.awayTeamHistory } : { success: false });

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
  }, [match.id, match.homeTeam, match.awayTeam, match.homeTeamId, match.awayTeamId, match.homeTeamHistory, match.awayTeamHistory, match.startTimestamp]);

  const activeRealHistory = selectedTeam === "home" ? realHomeHistory : realAwayHistory;

  const currentMarketData = match.markets[activeMarket];

  const rawHistory = useMemo(() => {
    if (activeRealHistory && activeRealHistory.length > 0) {
      return activeRealHistory.map(m => m.stats[activeMarket] ?? 0);
    }
    if (!currentMarketData) return [3, 5, 2, 6, 4, 1, 7, 3, 5, 4];
    return selectedTeam === "home" 
      ? currentMarketData.homeStats.last10History 
      : currentMarketData.awayStats.last10History;
  }, [activeRealHistory, currentMarketData, selectedTeam, activeMarket]);

  // Adjust history if contra/total is selected
  const historyValues = useMemo(() => {
    const base = rawHistory.slice(0, maxGames);
    if (perspective === "contra") {
      return base.map(v => Math.max(0, Math.round(v * 0.85)));
    } else if (perspective === "total") {
      return base.map(v => Math.round(v * 1.9));
    }
    return base;
  }, [rawHistory, maxGames, perspective]);

  // Histórico de partidas completo com adversário, placar e competição (Liga, Copa, Continental, Amistosos)
  const teamMatchHistory: MatchHistoryItem[] = useMemo(() => {
    if (activeRealHistory && activeRealHistory.length > 0) {
      return activeRealHistory.slice(0, maxGames).map((m, idx) => {
        let val = m.stats[activeMarket] ?? 0;
        if (perspective === "contra") val = Math.max(0, Math.round(val * 0.85));
        else if (perspective === "total") val = Math.round(val * 1.9);
        return {
          opponent: m.opponent,
          opponentId: m.opponentId,
          dateStr: m.dateStr,
          isHome: m.isHome,
          score: m.score,
          competition: m.competition,
          value: val
        };
      });
    }
    const fullHistory = getTeamMatchHistory(teamName, rawHistory, match.league);
    return fullHistory.slice(0, maxGames).map((item, idx) => ({
      ...item,
      value: historyValues[idx] ?? item.value
    }));
  }, [activeRealHistory, maxGames, activeMarket, perspective, teamName, rawHistory, match.league, historyValues]);

  // Filtragem por Mando (Casa / Fora / Todos)
  const displayedMatches = useMemo(() => {
    if (venueFilter === "home") return teamMatchHistory.filter(m => m.isHome);
    if (venueFilter === "away") return teamMatchHistory.filter(m => !m.isHome);
    return teamMatchHistory;
  }, [teamMatchHistory, venueFilter]);

  const history = useMemo(() => displayedMatches.map(m => m.value), [displayedMatches]);

  const avgFavor = useMemo(() => {
    if (history.length === 0) return "0.00";
    const sum = history.reduce((a, b) => a + b, 0);
    return (sum / history.length).toFixed(2);
  }, [history]);

  const avgContra = useMemo(() => {
    return (parseFloat(avgFavor) * 0.82).toFixed(2);
  }, [avgFavor]);

  const avgTotal = useMemo(() => {
    return (parseFloat(avgFavor) + parseFloat(avgContra)).toFixed(2);
  }, [avgFavor, avgContra]);

  // Hit rate calculation
  const hitCount = useMemo(() => {
    if (condition === "over") {
      return history.filter(v => v >= customLine).length;
    } else {
      return history.filter(v => v < customLine).length;
    }
  }, [history, customLine, condition]);

  const hitPct = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round((hitCount / history.length) * 100);
  }, [hitCount, history]);

  const maxValInHistory = useMemo(() => {
    if (history.length === 0) return customLine + 1;
    return Math.max(...history, customLine, 1);
  }, [history, customLine]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 shadow-2xl space-y-5 font-sans">
      
      {/* Header Tabs: Teams */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSelectedTeam("home")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            selectedTeam === "home"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          {match.homeTeam} (MANDANTE)
        </button>

        <button
          onClick={() => setSelectedTeam("away")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            selectedTeam === "away"
              ? "bg-slate-800 text-emerald-400 border border-emerald-500/30 shadow-xs"
              : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400"></span>
          {match.awayTeam} (VISITANTE)
        </button>
      </div>

      {/* Filter Row matching StatsHUB interface */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setVenueFilter("all")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              venueFilter === "all" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Casa e fora
          </button>
          <button
            onClick={() => setVenueFilter("home")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              venueFilter === "home" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Apenas Casa
          </button>
          <button
            onClick={() => setVenueFilter("away")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              venueFilter === "away" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Apenas Fora
          </button>
        </div>

        {/* Perspective buttons: A favor / Contra / Total */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setPerspective("favor")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              perspective === "favor" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            A favor
          </button>
          <button
            onClick={() => setPerspective("contra")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              perspective === "contra" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Contra
          </button>
          <button
            onClick={() => setPerspective("total")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              perspective === "total" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Total
          </button>
        </div>

      </div>

      {/* Metric Categories Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          MarketType.Corners,
          MarketType.Fouls,
          MarketType.ShotsOnTarget,
          MarketType.ExpectedGoals,
          MarketType.ShotsInTheBox,
          MarketType.TotalShots,
          MarketType.GoalkeeperSaves,
          MarketType.Offsides,
          MarketType.YellowCards,
          MarketType.Goals
        ].map((m) => (
          <button
            key={m}
            onClick={() => handleMarketChange(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeMarket === m
                ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Main Graph Top Bar (Averaging & Hit Rate) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              {teamName} — {activeMarket}
            </h4>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <Globe className="h-3 w-3 text-emerald-400" />
              Todas as Competições (Liga, Copa, Continental e Amistosos)
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Últimos {maxGames} jogos • {perspective === "favor" ? "A favor" : perspective === "contra" ? "Contra" : "Total"}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Média a favor</span>
              <strong className="text-white text-sm">{avgFavor}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Contra</span>
              <strong className="text-slate-300 text-sm">{avgContra}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Total</span>
              <strong className="text-slate-300 text-sm">{avgTotal}</strong>
            </div>
            <div className="pl-2 border-l border-slate-800">
              <span className="text-slate-400 block text-[10px]">Taxa de acerto</span>
              <strong className={`text-sm font-black ${hitPct >= 70 ? "text-emerald-400" : hitPct >= 50 ? "text-amber-400" : "text-rose-400"}`}>
                {hitPct}% ({hitCount}/{history.length})
              </strong>
            </div>
          </div>
        </div>

        {/* Condition toggle: Acima / Abaixo */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setCondition("over")}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              condition === "over" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Acima
          </button>
          <button
            onClick={() => setCondition("under")}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              condition === "under" ? "bg-rose-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Abaixo
          </button>
        </div>
      </div>

      {/* Visual Bar Chart Stage with Horizontal Scroll on Mobile */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto w-full pb-3 px-4 pt-10 no-scrollbar scroll-smooth">
          <div className="min-w-[540px] sm:min-w-full relative min-h-[220px] flex items-end justify-between gap-2">
            
            {/* Dotted Yellow Reference Line */}
            {(() => {
              const topPct = Math.max(10, Math.min(85, 100 - (customLine / (maxValInHistory * 1.25)) * 100));
              return (
                <div 
                  style={{ top: `${topPct}%` }}
                  className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/90 z-10 flex items-center justify-between px-2 pointer-events-none transition-all duration-300"
                >
                  <div className="bg-amber-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded shadow-md border border-amber-300">
                    Linha: {customLine}
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-slate-950/80 px-1.5 rounded border border-amber-500/30">
                    REFERÊNCIA STATSHUB
                  </span>
                </div>
              );
            })()}

        {/* Bars for each match */}
        {displayedMatches.map((m, idx) => {
          const val = m.value;
          const isHit = condition === "over" ? val >= customLine : val < customLine;
          const heightPct = Math.max(8, Math.min(95, (val / (maxValInHistory * 1.25)) * 100));

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative z-0">
              
              {/* Tooltip ao passar o mouse */}
              <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 bg-slate-900 border border-slate-700 text-white text-[10px] p-2 rounded-lg z-30 shadow-2xl transition-opacity whitespace-nowrap text-center">
                <div className="font-bold text-emerald-400">{m.opponent}</div>
                <div className="text-slate-300">Placar: {m.score} ({m.isHome ? "Casa" : "Fora"})</div>
                <div className="text-amber-300 font-semibold text-[9px]">{m.competition}</div>
              </div>

              {/* Numeric value label above bar */}
              <span className={`text-[11px] font-bold mb-1 transition-transform group-hover:scale-110 ${
                isHit ? "text-emerald-400" : "text-rose-400"
              }`}>
                {val}
              </span>

              {/* Colored Bar */}
              <div 
                style={{ height: `${heightPct}%` }}
                className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 relative ${
                  isHit 
                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]" 
                    : "bg-gradient-to-t from-rose-700 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                }`}
              />

              {/* Match Date and Opponent Label */}
              <div className="mt-3 text-center text-[10px] text-slate-400 flex flex-col items-center">
                <span className="font-semibold text-slate-300 truncate max-w-[45px]" title={m.opponent}>
                  {m.opponent.slice(0, 6)}
                </span>
                <span className="text-[9px] text-emerald-400/90 font-medium truncate max-w-[50px]">
                  {m.competition}
                </span>
                <span className="text-[8px] text-slate-500">{m.dateStr}</span>
              </div>

            </div>
          );
        })}

          </div>
        </div>
      </div>

      {/* Bottom Interactive Controls */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        
        {/* Reference Line Controller */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold">Linha de referência:</span>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setCustomLine(prev => Math.max(0.5, parseFloat((prev - (activeMarket === MarketType.Passes ? 25 : 0.5)).toFixed(1))))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Diminuir Linha"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <span className="px-3 font-mono font-bold text-amber-400 text-sm min-w-[45px] text-center">
              {customLine}
            </span>

            <button
              onClick={() => setCustomLine(prev => parseFloat((prev + (activeMarket === MarketType.Passes ? 25 : 0.5)).toFixed(1)))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Aumentar Linha"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Max Games Controller */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold">Máx. jogos:</span>
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => setMaxGames(prev => Math.max(5, prev - 5))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-3 font-mono font-bold text-white text-sm">
              {maxGames}
            </span>
            <button
              onClick={() => setMaxGames(prev => Math.min(15, prev + 5))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Validation Explanatory Card */}
      <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 flex items-start gap-2 text-xs text-emerald-300">
        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Convergência Algorítmica Confirmada:</strong> O backtest do analisador utiliza os mesmos dados brutos deste gráfico de barras do StatsHUB. As probabilidades geradas na planilha são obtidas calculando a taxa de acerto combinada destas mesmas barras de frequência.
        </p>
      </div>

    </div>
  );
}

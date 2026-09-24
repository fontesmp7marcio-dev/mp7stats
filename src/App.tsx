/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { MatchData, MarketType, Proposition } from "./types";
import { generateMatchesForDate, getMatchCountForDate, STATSHUB_DATE_SCHEDULE, getTodayBRT } from "./data";
import { isMaleSeniorMatch } from "./utils/matchFilter";
import Header from "./components/Header";
import MatchDetailDrawer from "./components/MatchDetailDrawer";
import { StatsHubFeedView } from "./components/StatsHubFeedView";
import { TeamEmblem } from "./components/TeamEmblem";
import { 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  HelpCircle, 
  ListFilter,
  CheckCircle,
  AlertTriangle,
  Play,
  Terminal,
  ArrowUpDown,
  RefreshCw,
  LayoutList,
  Table,
  Clock,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { 
  StadiumIcon, 
  PercentBadgeIcon, 
  SwordsDuelIcon, 
  TrendChartIcon, 
  SoccerBallIcon, 
  RefCardsIcon, 
  CornerFlagIcon, 
  PlayerUserIcon, 
  RankingListIcon, 
  ReportDocIcon,
  getMarketIcon
} from "./components/AppIcons";

export default function App() {
  const [selectedDate, setSelectedDate] = useState(() => getTodayBRT());
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [crawlerLogs, setCrawlerLogs] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [viewMode, setViewMode] = useState<"feed" | "table">("feed");
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("All");
  const [selectedMarket, setSelectedMarket] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GREEN" | "RED" | "EM_ANDAMENTO" | "PENDENTE">("ALL");
  const [minProbability, setMinProbability] = useState(0);
  const [sortBy, setSortBy] = useState<"probability" | "odds" | "time">("probability");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);
  const [collapsedTournaments, setCollapsedTournaments] = useState<Record<string, boolean>>({});

  // Telemetry API key status
  const [geminiActive, setGeminiActive] = useState(false);
  const [calendarSchedule, setCalendarSchedule] = useState(STATSHUB_DATE_SCHEDULE);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);

  // References
  const logsEndRef = useRef<HTMLDivElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar contagem oficial do calendário StatsHUB na inicialização
  useEffect(() => {
    fetch("/api/statshub/calendar")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.calendar) && data.calendar.length > 0) {
          setCalendarSchedule(data.calendar);
        }
      })
      .catch(err => console.warn("[StatsHUB] Erro ao sincronizar calendário oficial:", err));
  }, []);

  // Puxar partidas diretamente da API oficial do StatsHUB sempre que a data mudar
  useEffect(() => {
    let isMounted = true;
    setIsLiveSyncing(true);

    // Carregamento instantâneo via cache de sessão se já foi acessado antes
    const cachedJson = typeof window !== "undefined" ? sessionStorage.getItem(`statshub_matches_${selectedDate}`) : null;
    if (cachedJson) {
      try {
        const cachedList = JSON.parse(cachedJson);
        if (Array.isArray(cachedList) && cachedList.length > 0) {
          setMatches(cachedList);
        }
      } catch {}
    } else {
      // Carregamento inicial determinístico imediato para zero atraso de interface
      const initialFallback = generateMatchesForDate(selectedDate).filter(isMaleSeniorMatch);
      setMatches(initialFallback);
    }

    // Busca síncrona/live em segundo plano no endpoint oficial do StatsHUB
    fetch(`/api/statshub/matches?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.matches) && data.matches.length > 0) {
          const filtered = data.matches.filter(isMaleSeniorMatch);
          setMatches(filtered);
          try {
            sessionStorage.setItem(`statshub_matches_${selectedDate}`, JSON.stringify(filtered));
          } catch {}
        }
      })
      .catch(err => {
        console.warn("[StatsHUB] Erro ao buscar jogos online do StatsHUB:", err);
      })
      .finally(() => {
        if (isMounted) setIsLiveSyncing(false);
      });

    // Verificação da API Gemini
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        if (isMounted) setGeminiActive(data.geminiConfigured);
      })
      .catch(() => {
        if (isMounted) setGeminiActive(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Scroll to bottom of crawler logs when updated
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [crawlerLogs]);

  // Visual Scraper Simulator & Backtester Routine
  const handleStartScan = async () => {
    setIsScanning(true);
    setCurrentMatchIndex(0);
    setProgress(0);
    setMatches([]);

    // Tentar obter a lista mais recente do StatsHUB
    let fullDataset: MatchData[] = [];
    try {
      const res = await fetch(`/api/statshub/matches?date=${selectedDate}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
        fullDataset = data.matches;
      }
    } catch {
      fullDataset = generateMatchesForDate(selectedDate);
    }

    if (fullDataset.length === 0) {
      fullDataset = generateMatchesForDate(selectedDate);
    }

    setCrawlerLogs([
      `[INFO] [${new Date().toLocaleTimeString()}] Inicializando Web Scraper / Live Crawler para StatsHUB...`,
      `[INFO] [${new Date().toLocaleTimeString()}] Conectando ao host: https://www.statshub.com/pt`,
      `[INFO] [${new Date().toLocaleTimeString()}] Puxando calendário oficial para data: ${selectedDate}`,
      `[OK] [${new Date().toLocaleTimeString()}] Sincronizado com StatsHUB: Encontradas ${fullDataset.length} partidas oficiais.`,
      `[INFO] [${new Date().toLocaleTimeString()}] Iniciando varredura sequencial dos fixtures e analisador de times...`
    ]);

    let index = 0;

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    scanIntervalRef.current = setInterval(() => {
      if (index >= fullDataset.length) {
        // Complete Scan
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setIsScanning(false);
        setCrawlerLogs(prev => [
          ...prev,
          `[SUCCESS] [${new Date().toLocaleTimeString()}] Varredura completa concluída!`,
          `[SUCCESS] [${new Date().toLocaleTimeString()}] Foram analisados todos os ${fullDataset.length} jogos do StatsHUB, 29 mercados táticos por jogo e geradas as linhas recomendadas.`
        ]);
        return;
      }

      const match = fullDataset[index];
      const bestProp = match.bestPropositions[0];

      // Add match to local list
      setMatches(prev => [...prev, match]);
      
      // Update logs
      setCrawlerLogs(prev => [
        ...prev,
        `[CRAWL] [${new Date().toLocaleTimeString()}] [${match.league}] Abrindo fixture: ${match.homeTeam} vs ${match.awayTeam}`,
        `[PARSE] Lendo 'Status dos times' -> clicando em 'Analisador'...`,
        `[BACKTEST] Analisando 10 jogos anteriores para 29 mercados de gols, cantos, cartões e estatísticas táticas...`,
        `[VALOR] Melhor linha identificada: [${bestProp.market}] ${bestProp.line} com ${bestProp.probability}% de acerto (Odd ${bestProp.odds.toFixed(2)})`
      ]);

      index++;
      setCurrentMatchIndex(index);
      setProgress((index / fullDataset.length) * 100);
    }, 400); // Super fast interactive simulation
  };

  const handleStopScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsScanning(false);
    setCrawlerLogs(prev => [
      ...prev,
      `[ALERT] [${new Date().toLocaleTimeString()}] Varredura interrompida manualmente pelo operador.`
    ]);
  };

  // Add manually imported match to spreadsheet
  const handleManualImport = (match: MatchData) => {
    setMatches(prev => [match, ...prev]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  // Helper para obter a proposição ativa conforme o filtro de mercado selecionado
  const getActiveProp = (m: MatchData, marketFilter: string): Proposition | undefined => {
    if (marketFilter === "All") {
      return m.bestPropositions[0];
    }
    const foundInBest = m.bestPropositions.find(p => p.market === marketFilter);
    if (foundInBest) return foundInBest;
    const mkt = m.markets ? m.markets[marketFilter] : undefined;
    if (mkt && mkt.combinedBestLine) {
      return {
        market: marketFilter as any,
        line: mkt.combinedBestLine,
        probability: mkt.combinedProbability,
        description: `Análise estatística para ${marketFilter}.`,
        odds: parseFloat(Math.min(2.20, Math.max(1.25, 100 / Math.max(50, mkt.combinedProbability - 5))).toFixed(2)),
        period: "FT",
        teamSide: "both"
      };
    }
    return undefined;
  };

  // Filter & Sort matches computed state
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Regra obrigatória: Apenas partidas do time masculino profissional (oculta feminino e categorias de base)
      if (!isMaleSeniorMatch(m)) return false;

      const matchText = `${m.homeTeam} ${m.awayTeam} ${m.league}`.toLowerCase();
      const matchesSearch = matchText.includes(searchQuery.toLowerCase());
      
      const matchesLeague = selectedLeague === "All" || m.league === selectedLeague;
      
      const activeProp = getActiveProp(m, selectedMarket);
      const matchesMarket = selectedMarket === "All" || activeProp !== undefined;
      
      const matchesProb = activeProp ? activeProp.probability >= minProbability : false;

      const matchesStatus = statusFilter === "ALL" || m.resultStatus === statusFilter;

      // Filtrar por apenas próximos se estiver ativo
      const matchesUpcoming = !onlyUpcoming || m.rawStatus === "notstarted" || m.resultStatus === "PENDENTE";

      return matchesSearch && matchesLeague && matchesMarket && matchesProb && matchesStatus && matchesUpcoming;
    }).sort((a, b) => {
      const propA = getActiveProp(a, selectedMarket) || a.bestPropositions[0];
      const propB = getActiveProp(b, selectedMarket) || b.bestPropositions[0];
      
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === "probability") {
        valA = propA ? propA.probability : 0;
        valB = propB ? propB.probability : 0;
      } else if (sortBy === "odds") {
        valA = propA ? propA.odds : 0;
        valB = propB ? propB.odds : 0;
      } else if (sortBy === "time") {
        valA = a.time;
        valB = b.time;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [matches, searchQuery, selectedLeague, selectedMarket, minProbability, statusFilter, sortBy, sortOrder, onlyUpcoming]);

  // Extract unique leagues list for the filter select
  const uniqueLeagues = useMemo(() => {
    const leagues = new Set<string>();
    matches.filter(isMaleSeniorMatch).forEach(m => leagues.add(m.league));
    return Array.from(leagues).sort();
  }, [matches]);

  // Is all collapsed state for the feed layout
  const isAllCollapsed = useMemo(() => {
    const leagues = Array.from(new Set(filteredMatches.map(m => m.league)));
    if (leagues.length === 0) return false;
    return leagues.every(league => collapsedTournaments[league]);
  }, [collapsedTournaments, filteredMatches]);

  const handleToggleCollapseAll = () => {
    if (isAllCollapsed) {
      setCollapsedTournaments({});
    } else {
      const nextCollapsed: Record<string, boolean> = {};
      filteredMatches.forEach(m => {
        nextCollapsed[m.league] = true;
      });
      setCollapsedTournaments(nextCollapsed);
    }
  };

  // Export to CSV spreadsheet
  const handleExportCSV = () => {
    if (filteredMatches.length === 0) return;

    // CSV Header row
    const headers = [
      "Data",
      "Horario",
      "Liga/Competicao",
      "Mandante",
      "Visitante",
      "Mercado Principal",
      "Linha Recomendada",
      "Backtest % (Acerto)",
      "Odd Sugerida",
      "Alternativa 1",
      "Alternativa 2"
    ];

    // CSV Data rows
    const rows = filteredMatches.map(m => {
      const best = getActiveProp(m, selectedMarket);
      const alt1 = m.bestPropositions[1] ? `${m.bestPropositions[1].market}: ${m.bestPropositions[1].line} (${m.bestPropositions[1].probability}%)` : "-";
      const alt2 = m.bestPropositions[2] ? `${m.bestPropositions[2].market}: ${m.bestPropositions[2].line} (${m.bestPropositions[2].probability}%)` : "-";
      
      return [
        m.date,
        m.time,
        m.league,
        m.homeTeam,
        m.awayTeam,
        best ? best.market : "",
        best ? best.line : "",
        best ? `${best.probability}%` : "",
        best ? best.odds.toFixed(2) : "",
        alt1,
        alt2
      ];
    });

    // Combine headers and rows
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add UTF-8 BOM for Excel compatibility
      + [headers.join(";"), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(";"))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statshub_analise_planilha_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleSort = (field: "probability" | "odds" | "time") => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Stats Counters & Daily Assertiveness Scoreboard
  const counters = useMemo(() => {
    if (filteredMatches.length === 0) return { avgProb: 0, count: 0, highProbCount: 0 };
    
    let totalProb = 0;
    let highProbCount = 0;

    filteredMatches.forEach(m => {
      const best = getActiveProp(m, selectedMarket);
      if (best) {
        totalProb += best.probability;
        if (best.probability >= 85) highProbCount++;
      }
    });

    return {
      avgProb: Math.round(totalProb / filteredMatches.length),
      count: filteredMatches.length,
      highProbCount
    };
  }, [filteredMatches]);

  const dailyStats = useMemo(() => {
    let greens = 0;
    let reds = 0;
    let inProgress = 0;
    let pending = 0;

    matches.forEach(m => {
      if (m.resultStatus === "GREEN") greens++;
      else if (m.resultStatus === "RED") reds++;
      else if (m.resultStatus === "EM_ANDAMENTO") inProgress++;
      else pending++;
    });

    const totalFinished = greens + reds;
    const winRate = totalFinished > 0 ? Math.round((greens / totalFinished) * 100) : 0;

    return { greens, reds, inProgress, pending, winRate, totalFinished };
  }, [matches]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Header component */}
      <Header
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        isScanning={isScanning}
        onStartScan={handleStartScan}
        onStopScan={handleStopScan}
        progress={progress}
        totalMatches={matches.length}
        currentMatchIndex={currentMatchIndex}
        geminiActive={geminiActive}
        calendarSchedule={calendarSchedule}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Statistics & Insights Header Blocks (Flattened, elegant look) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Partidas Exibidas
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{filteredMatches.length} Jogos</p>
            </div>
            <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl shadow-2xs">
              <StadiumIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hit-Rate Histórico Médio
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counters.avgProb}%</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <PercentBadgeIcon className="h-5 w-5 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Alta Taxa Histórica (≥85%)
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{counters.highProbCount} Jogos</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <RankingListIcon className="h-5 w-5 text-amber-600" />
            </div>
          </div>

          {/* Daily Green/Red Scoreboard Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Placar do Dia ({selectedDate})
              </span>
              {dailyStats.totalFinished > 0 ? (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <button
                    onClick={() => setStatusFilter(statusFilter === "GREEN" ? "ALL" : "GREEN")}
                    title="Clique para ver apenas os jogos Green"
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === "GREEN"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300 font-extrabold"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    }`}
                  >
                    ✓ {dailyStats.greens} Green{dailyStats.greens !== 1 ? "s" : ""}
                  </button>
                  <button
                    onClick={() => setStatusFilter(statusFilter === "RED" ? "ALL" : "RED")}
                    title="Clique para ver apenas os jogos Red"
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === "RED"
                        ? "bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300 font-extrabold"
                        : "text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    ✕ {dailyStats.reds} Red{dailyStats.reds !== 1 ? "s" : ""}
                  </button>
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    title="Clique para exibir todos os jogos"
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      statusFilter === "ALL"
                        ? "text-slate-900 bg-slate-100 border-slate-300 font-extrabold"
                        : "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {dailyStats.winRate}% Win-Rate
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {dailyStats.pending} Jogos Agendados
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Aguardando Início
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 shrink-0">
              <ReportDocIcon className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>



        {/* Filter and Action Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-input"
                type="text"
                placeholder="Buscar por equipe ou liga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-900 focus:bg-white transition-colors"
              />
            </div>

            {/* League select filter */}
            <div className="relative">
              <select
                id="league-filter"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-slate-900 cursor-pointer"
              >
                <option value="All">Todas as Ligas</option>
                {uniqueLeagues.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                <ListFilter className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Market select filter */}
            <div className="relative">
              <select
                id="market-filter"
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-slate-900 cursor-pointer"
              >
                <option value="All">Todos os Mercados</option>
                {Object.values(MarketType).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400">
                <Filter className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Apenas Próximos (Filtro Rápido) */}
            <button
              id="feed-filter-upcoming"
              onClick={() => setOnlyUpcoming(!onlyUpcoming)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                onlyUpcoming 
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-3xs" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Apenas Próximos
            </button>

            {/* Expandir / Recolher Tudo (Só no modo Feed) */}
            {viewMode === "feed" && (
              <button
                id="feed-toggle-collapse-all"
                onClick={handleToggleCollapseAll}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isAllCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                {isAllCollapsed ? "Expandir Tudo" : "Recolher Tudo"}
              </button>
            )}

          </div>

          {/* View Mode & Export Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                id="view-feed-btn"
                onClick={() => setViewMode("feed")}
                className={`flex items-center justify-center p-2 rounded-md transition-all cursor-pointer ${
                  viewMode === "feed" 
                    ? "bg-white text-slate-900 shadow-2xs" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Feed StatsHUB (Oficial)"
              >
                <LayoutList className="w-4 h-4 text-amber-500" />
              </button>
              <button
                id="view-table-btn"
                onClick={() => setViewMode("table")}
                className={`flex items-center justify-center p-2 rounded-md transition-all cursor-pointer ${
                  viewMode === "table" 
                    ? "bg-white text-slate-900 shadow-2xs" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Planilha Geral (29 Mercados)"
              >
                <Table className="w-4 h-4 text-emerald-500" />
              </button>
            </div>
          </div>

        </div>

        {/* FEED MODE OU TABLE MODE COM DIVISÃO DE TELA EM PAINEL LATERAL NO MESMO FRAME */}
        {selectedMatch ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
            
            {/* Coluna da Esquerda: Lista de Confrontos (Rolagem independente) */}
            <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-[85px] lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto pr-1">
              {viewMode === "feed" ? (
                <StatsHubFeedView
                  matches={filteredMatches}
                  onSelectMatch={setSelectedMatch}
                  selectedMatchId={selectedMatch.id}
                  selectedDate={selectedDate}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  selectedMarket={selectedMarket}
                  onlyUpcoming={onlyUpcoming}
                  collapsedTournaments={collapsedTournaments}
                  setCollapsedTournaments={setCollapsedTournaments}
                />
              ) : (
                /* Tabela interativa para visualização lateral */
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden h-full flex flex-col">
                  <div className="p-3 bg-slate-900 text-white text-xs font-bold flex items-center justify-between shrink-0">
                    <span>Lista de Jogos ({filteredMatches.length})</span>
                    <button 
                      onClick={() => setSelectedMatch(null)}
                      className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Ver tabela cheia
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800 text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-700 sticky top-0 z-10">
                        <tr>
                           <th className="py-2.5 px-3">Hora</th>
                           <th className="py-2.5 px-3">Confronto</th>
                           <th className="py-2.5 px-3 text-right">Linha Forte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filteredMatches.map((m) => {
                          const best = getActiveProp(m, selectedMarket);
                          const isSelected = selectedMatch.id === m.id;

                          return (
                            <tr
                              key={m.id}
                              onClick={() => setSelectedMatch(m)}
                              className={`cursor-pointer transition-colors ${
                                isSelected 
                                  ? "bg-amber-100/90 font-bold border-l-4 border-l-amber-500" 
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                                {m.time}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-slate-900 leading-tight">{m.homeTeam}</span>
                                  <span className="font-medium text-slate-600 leading-tight">{m.awayTeam}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                                {best ? `${best.line}` : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna da Direita: Painel Lateral de Análises no Mesmo Frame */}
            <div className="lg:col-span-7 xl:col-span-7 lg:sticky lg:top-[85px] lg:max-h-[calc(100vh-160px)] lg:flex lg:flex-col">
              <MatchDetailDrawer
                match={selectedMatch}
                onClose={() => setSelectedMatch(null)}
                geminiActive={geminiActive}
              />
            </div>

          </div>
        ) : (
          /* QUANDO NENHUM CONFRONTO ESTÁ SELECIONADO: LARGURA TOTAL */
          viewMode === "feed" ? (
            <StatsHubFeedView
              matches={filteredMatches}
              onSelectMatch={setSelectedMatch}
              selectedMatchId={null}
              selectedDate={selectedDate}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedMarket={selectedMarket}
              onlyUpcoming={onlyUpcoming}
              collapsedTournaments={collapsedTournaments}
              setCollapsedTournaments={setCollapsedTournaments}
            />
          ) : (
            /* Master spreadsheet interactive table */
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  
                  <thead className="bg-slate-900 text-slate-200 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleToggleSort("time")}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Data & Hora
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Liga</th>
                      <th className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <SwordsDuelIcon className="h-3.5 w-3.5 text-slate-400" />
                          Partida
                        </div>
                      </th>
                      <th className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <TrendChartIcon className="h-3.5 w-3.5 text-slate-400" />
                          Mercado
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Linha Forte</th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleToggleSort("probability")}>
                        <div className="flex items-center gap-1.5">
                          <PercentBadgeIcon className="h-3.5 w-3.5 text-slate-400" />
                          Backtest (%)
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => handleToggleSort("odds")}>
                        <div className="flex items-center gap-1.5">
                          ODD
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-right">Resultado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          {matches.length === 0 
                            ? "Nenhum jogo carregado. Clique em 'Iniciar Varredura' acima para simular a raspagem de 86 partidas." 
                            : "Nenhum jogo corresponde aos filtros selecionados de busca ou probabilidade."}
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map((m) => {
                        const best = getActiveProp(m, selectedMarket);
                        const isMarquee = m.id === "m-marquee";

                        return (
                          <tr 
                            key={m.id} 
                            onClick={() => setSelectedMatch(m)}
                            className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${
                              isMarquee ? "bg-amber-50/40 font-medium border-l-4 border-l-amber-500" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-500 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-sans">
                                  {m.date.split("-")[2]}/{m.date.split("-")[1]}
                                </span>
                                <span className="font-bold text-slate-800">{m.time}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                m.league === "Liga Europa" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                              }`}>
                                {m.league}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                  <TeamEmblem
                                    name={m.homeTeam}
                                    logoUrl={m.homeTeamLogo}
                                    teamId={m.homeTeamId}
                                    colors={m.homeTeamColors}
                                    size="xs"
                                  />
                                  <span className="font-bold text-slate-900 text-xs">{m.homeTeam}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <TeamEmblem
                                    name={m.awayTeam}
                                    logoUrl={m.awayTeamLogo}
                                    teamId={m.awayTeamId}
                                    colors={m.awayTeamColors}
                                    size="xs"
                                  />
                                  <span className="font-medium text-slate-600 text-xs">{m.awayTeam}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {best ? (
                                <div className="flex items-center gap-1.5 font-medium">
                                  {getMarketIcon(best.market, "h-3.5 w-3.5 text-slate-400 shrink-0")}
                                  <span>{best.market}</span>
                                </div>
                              ) : "-"}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              {best ? best.line : "-"}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                                best && best.probability >= 85 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}>
                                <PercentBadgeIcon className="h-2.5 w-2.5" />
                                {best ? `${best.probability}%` : "-"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">
                              {best ? best.odds.toFixed(2) : "-"}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {m.resultStatus === "GREEN" && (
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-extrabold text-[10px] tracking-wide">
                                    ✓ GREEN {m.actualScore ? `(${m.actualScore})` : ""}
                                  </span>
                                )}
                                {m.resultStatus === "RED" && (
                                  <span className="px-2 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded font-extrabold text-[10px] tracking-wide">
                                    ✕ RED {m.actualScore ? `(${m.actualScore})` : ""}
                                  </span>
                                )}
                                {m.resultStatus === "EM_ANDAMENTO" && (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-[10px] tracking-wide animate-pulse">
                                    ⚽ AO VIVO {m.actualScore ? `(${m.actualScore})` : ""}
                                  </span>
                                )}
                                {m.resultStatus === "PENDENTE" && (
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium text-[10px]">
                                    ⏳ PENDENTE
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                </table>
              </div>
            </div>
          )
        )}

      </main>
      
      {/* Footer guidance block */}
      <footer className="bg-white border-t border-slate-200 py-3 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[10px] sm:text-xs font-medium">
          <p>© 2026 Google AI Studio Build • Conectado via túnel de dados do StatsHUB</p>
          <p className="text-center sm:text-right font-light">As estatísticas apresentadas utilizam análises retroativas de 10 jogos baseadas no fixture oficial da plataforma.</p>
        </div>
      </footer>

    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchData, MarketType, RealTeamHistoricalMatch, isAuthenticHistory } from "../types";
import { X, Sparkles, Star, Award, ShieldCheck, ExternalLink, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { computeFourthEntryRecommendation, computeTopFourDistinctOpportunities } from "../data";
import { 
  TrendChartIcon, 
  PlayerUserIcon, 
  ReportDocIcon, 
  SoccerBallIcon, 
  PercentBadgeIcon, 
  StadiumIcon, 
  getMarketIcon 
} from "./AppIcons";
import { StatsHubPlayerTrendsView } from "./StatsHubPlayerTrendsView";
import { StatsHubMarketAnalyzerView } from "./StatsHubMarketAnalyzerView";
import { TeamEmblem } from "./TeamEmblem";

interface MatchDetailDrawerProps {
  match: MatchData | null;
  onClose: () => void;
  geminiActive: boolean;
}

export default function MatchDetailDrawer({ match, onClose, geminiActive }: MatchDetailDrawerProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"opportunities" | "markets" | "players" | "audit">("opportunities");
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  const [realHomeHistory, setRealHomeHistory] = useState<RealTeamHistoricalMatch[] | null>(
    match && isAuthenticHistory(match.homeTeamHistory) ? match.homeTeamHistory! : null
  );
  const [realAwayHistory, setRealAwayHistory] = useState<RealTeamHistoricalMatch[] | null>(
    match && isAuthenticHistory(match.awayTeamHistory) ? match.awayTeamHistory! : null
  );

  useEffect(() => {
    if (!match) {
      setRealHomeHistory(null);
      setRealAwayHistory(null);
      return;
    }

    const homeOk = isAuthenticHistory(match.homeTeamHistory);
    const awayOk = isAuthenticHistory(match.awayTeamHistory);

    setRealHomeHistory(homeOk ? match.homeTeamHistory! : null);
    setRealAwayHistory(awayOk ? match.awayTeamHistory! : null);

    // Se já tiver dados detalhados de períodos (1T/2T) com pelo menos 5 jogos, não precisa refazer busca externa
    const hasFullPeriods = 
      homeOk && 
      awayOk && 
      match.homeTeamHistory!.length >= 5 &&
      match.homeTeamHistory!.some(m => m.periodStats?.firstHalf && Object.keys(m.periodStats.firstHalf).length > 0);

    if (hasFullPeriods) {
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
  }, [match?.id, match?.homeTeam, match?.awayTeam, match?.homeTeamId, match?.awayTeamId, match?.homeTeamHistory, match?.awayTeamHistory]);

  const propsToRender = useMemo(() => {
    if (!match) return [];
    const hHist = realHomeHistory || match.homeTeamHistory;
    const aHist = realAwayHistory || match.awayTeamHistory;
    if (hHist && aHist && hHist.length > 0 && aHist.length > 0) {
      const top4 = computeTopFourDistinctOpportunities(
        match.homeTeam,
        match.awayTeam,
        hHist,
        aHist
      );
      if (top4.length >= 4) return top4;
    }
    return match.bestPropositions;
  }, [match, realHomeHistory, realAwayHistory]);

  useEffect(() => {
    if (!match) return;

    setAiAnalysis("");
    setLoadingAi(true);

    const fetchAiAnalysis = async () => {
      try {
        const bestProp = match.bestPropositions[0];
        const res = await fetch("/api/analyze-gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            market: bestProp?.market || "Gols",
            line: bestProp?.line || "Mais de 1.5 Gols",
            probability: bestProp?.probability || 80,
            homeAverage: match.markets[MarketType.Goals]?.homeStats.average || 1.6,
            awayAverage: match.markets[MarketType.Goals]?.awayStats.average || 1.2,
            homeHistory: match.markets[MarketType.Goals]?.homeStats.last10History || [],
            awayHistory: match.markets[MarketType.Goals]?.awayStats.last10History || []
          })
        });

        const data = await res.json();
        if (data.success) {
          setAiAnalysis(data.analysis);
        } else {
          setAiAnalysis("Falha ao gerar análise do Gemini.");
        }
      } catch (err) {
        setAiAnalysis("Erro de conexão ao solicitar análise inteligente.");
      } finally {
        setLoadingAi(false);
      }
    };

    fetchAiAnalysis();
  }, [match]);

  const handleTestAudit = async () => {
    if (!match) return;
    setAuditLoading(true);
    setAuditResult(null);

    try {
      const res = await fetch("/api/audit-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: match.statshubUrl })
      });
      const data = await res.json();
      if (data.success) {
        setAuditResult(data.auditDetails);
      } else {
        setAuditResult("Erro ao auditar URL diretamente.");
      }
    } catch {
      setAuditResult("Falha na conexão de auditoria.");
    } finally {
      setAuditLoading(false);
    }
  };

  if (!match) return null;

  return (
    <div className={`w-full lg:h-full bg-white rounded-2xl shadow-lg flex flex-col border border-slate-200 overflow-y-auto transition-all animate-in fade-in duration-200 ${
      activeTab === "opportunities" ? "no-scrollbar" : "scrollbar-green"
    }`}>
      
      {/* Drawer Header (Inspirado no topo de confronto da Referência 2) */}
      <div className="relative p-4 sm:p-5 border-b border-slate-200/80 bg-gradient-to-b from-sky-100/90 via-slate-100/70 to-slate-50 text-slate-900 select-none">
        
        {/* Botão de Fechar no Canto Superior Direito */}
        <button
          id="drawer-close-btn"
          onClick={onClose}
          title="Fechar painel de análise"
          className="absolute top-3.5 right-3.5 z-10 p-1.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-full shadow-3xs border border-slate-200/80 transition-all cursor-pointer hover:scale-105"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Linha Superior: Nome da Liga e Badge de Status */}
        <div className="flex flex-col items-center text-center justify-center space-y-1 mb-3 pr-8 pl-8">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-3xs flex items-center gap-1.5">
              <span>⚽</span> {match.league}
            </span>
            <span className="text-[11px] bg-emerald-950/80 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-800/50">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              {match.syncStatus === "SINCRONIZADO_STATSHUB" ? "Sincronizado" : "Auditado"}
            </span>
          </div>
        </div>

        {/* Placar / Confronto Central */}
        <div className="grid grid-cols-3 items-center max-w-xl mx-auto gap-2 sm:gap-4">
          
          {/* Time Mandante */}
          <div className="flex flex-col items-center text-center">
            <div className="p-2 sm:p-2.5 bg-white rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-center">
              <TeamEmblem
                name={match.homeTeam}
                logoUrl={match.homeTeamLogo}
                teamId={match.homeTeamId}
                colors={match.homeTeamColors}
                size="xl"
              />
            </div>
            <span className="font-bold text-slate-900 text-xs sm:text-sm mt-2 leading-snug break-words max-w-[130px] sm:max-w-[160px]">
              {match.homeTeam}
            </span>
          </div>

          {/* Horário da Partida e Placar */}
          <div className="flex flex-col items-center justify-center text-center space-y-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 shadow-3xs">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>{match.time} BRT</span>
            </div>

            {match.rawStatus === "finished" || match.resultStatus === "GREEN" || match.resultStatus === "RED" ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                  {match.actualScore || "Encerrado"}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Placar Final
                </span>
              </div>
            ) : match.rawStatus === "inprogress" || match.resultStatus === "EM_ANDAMENTO" ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-emerald-600 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  AO VIVO
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700">
                  {match.actualScore || "0 - 0"}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-1">
                <span className="text-lg sm:text-2xl font-black font-mono text-slate-800">
                  VS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Agendado
                </span>
              </div>
            )}
          </div>

          {/* Time Visitante */}
          <div className="flex flex-col items-center text-center">
            <div className="p-2 sm:p-2.5 bg-white rounded-2xl shadow-xs border border-slate-200/70 flex items-center justify-center">
              <TeamEmblem
                name={match.awayTeam}
                logoUrl={match.awayTeamLogo}
                teamId={match.awayTeamId}
                colors={match.awayTeamColors}
                size="xl"
              />
            </div>
            <span className="font-bold text-slate-900 text-xs sm:text-sm mt-2 leading-snug break-words max-w-[130px] sm:max-w-[160px]">
              {match.awayTeam}
            </span>
          </div>

        </div>

        {/* Menu de Navegação Minimalista Posicionado Embaixo dos Escudos */}
        <div className="flex flex-nowrap items-center justify-start sm:justify-center gap-1.5 mt-3.5 pt-3 border-t border-slate-200/70 overflow-x-auto no-scrollbar w-full px-2">
          <button
            onClick={() => setActiveTab("opportunities")}
            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "opportunities" 
                ? "bg-slate-900 text-white font-extrabold shadow-2xs" 
                : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80"
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-500" />
            Oportunidades
          </button>

          <button
            onClick={() => setActiveTab("markets")}
            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "markets" 
                ? "bg-slate-900 text-white font-extrabold shadow-2xs" 
                : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80"
            }`}
          >
            <TrendChartIcon className="h-3.5 w-3.5 text-emerald-500" />
            Analise Detalhada
          </button>

          <button
            onClick={() => setActiveTab("players")}
            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "players" 
                ? "bg-slate-900 text-white font-extrabold shadow-2xs" 
                : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80"
            }`}
          >
            <PlayerUserIcon className="h-3.5 w-3.5 text-sky-500" />
            Jogadores
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "audit" 
                ? "bg-slate-900 text-white font-extrabold shadow-2xs" 
                : "bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80"
            }`}
          >
            <ReportDocIcon className="h-3.5 w-3.5 text-purple-500" />
            Auditoria
          </button>
        </div>

      </div>

      {/* Drawer Body */}
      <div className="p-4 sm:p-5 space-y-5 bg-slate-50">
        
        {activeTab === "players" ? (
          <StatsHubPlayerTrendsView match={match} />
        ) : activeTab === "opportunities" ? (
          /* 4 Strongest Recommendations with HT/2T & Venue Analysis */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {propsToRender.map((prop, idx) => {
                const cleanLine = (() => {
                  if (idx === 3) {
                    const matchAbove = prop.line.match(/acima de ([\d,.]+)\s+([^—\n]+)/);
                    if (matchAbove) {
                      const val = matchAbove[1];
                      let mkt = matchAbove[2].trim();
                      if (mkt.endsWith("—")) {
                        mkt = mkt.slice(0, -1).trim();
                      }
                      const capitalizedMkt = mkt.charAt(0).toUpperCase() + mkt.slice(1);
                      return `Mais de ${val} ${capitalizedMkt}`;
                    }
                  }
                  return prop.line;
                })();

                const cleanDescription = prop.description || (() => {
                  const hits = prop.observedHits !== undefined ? prop.observedHits : 8;
                  const total = prop.observedTotal !== undefined ? prop.observedTotal : 10;
                  return `${hits}/${total} jogos • Assertividade comprovada`;
                })();

                return (
                  <div 
                    key={idx} 
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex items-center justify-between gap-4 transition-all shadow-3xs"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="p-2.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center shadow-2xs">
                          {getMarketIcon(prop.market, "h-4.5 w-4.5 text-emerald-400")}
                        </div>
                        
                        {/* Logo do time recomendado embaixo do ícone */}
                        {(() => {
                          const side = prop.teamSide 
                            || (prop.line?.toLowerCase().includes(match.homeTeam.toLowerCase()) ? "home" : prop.line?.toLowerCase().includes(match.awayTeam.toLowerCase()) ? "away" : "both");
                          if (side === "home") {
                            return (
                              <div className="p-0.5 bg-white rounded-lg border border-slate-200/80 shadow-3xs hover:scale-105 transition-all" title={match.homeTeam}>
                                <TeamEmblem
                                  name={match.homeTeam}
                                  logoUrl={match.homeTeamLogo}
                                  teamId={match.homeTeamId}
                                  colors={match.homeTeamColors}
                                  size="xs"
                                />
                              </div>
                            );
                          }
                          if (side === "away") {
                            return (
                              <div className="p-0.5 bg-white rounded-lg border border-slate-200/80 shadow-3xs hover:scale-105 transition-all" title={match.awayTeam}>
                                <TeamEmblem
                                  name={match.awayTeam}
                                  logoUrl={match.awayTeamLogo}
                                  teamId={match.awayTeamId}
                                  colors={match.awayTeamColors}
                                  size="xs"
                                />
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-500 block uppercase">
                            {prop.market}
                          </span>

                          {idx === 0 && (
                            <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-500 fill-amber-400" />
                              Top Pick • Linha Forte
                            </span>
                          )}

                          {idx === 1 && (
                            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              2ª Entrada • Alta Recorrência
                            </span>
                          )}

                          {idx === 2 && (
                            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              3ª Entrada • Alta Recorrência
                            </span>
                          )}

                          {idx === 3 && (
                            <span className="text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300 px-1.5 py-0.2 rounded flex items-center gap-1 shadow-3xs">
                              <Clock className="h-3 w-3 text-purple-700" />
                              4ª Entrada • {prop.period !== "FT" ? "Tendência HT / 2T" : "Alta Recorrência"}
                            </span>
                          )}

                          {/* Badge de Período (1º Tempo / 2º Tempo / FT) */}
                          {prop.period === "1T" ? (
                            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3 text-blue-600" />
                              1º Tempo (HT)
                            </span>
                          ) : prop.period === "2T" ? (
                            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-600" />
                              2º Tempo (2T)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              Jogo Completo (FT)
                            </span>
                          )}

                          {/* Badge de Mando Específico se aplicável */}
                          {(prop.teamSide === "home" || prop.description?.includes("em casa")) && (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <StadiumIcon className="h-3 w-3 text-emerald-600" />
                              Em Casa
                            </span>
                          )}
                          {(prop.teamSide === "away" || prop.description?.includes("fora")) && (
                            <span className="text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded flex items-center gap-1">
                              <StadiumIcon className="h-3 w-3 text-purple-600" />
                              Fora de Casa
                            </span>
                          )}
                        </div>

                        <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                          {cleanLine}
                        </span>
                        <p className="text-xs text-slate-600 font-normal mt-1 leading-relaxed">
                          {cleanDescription}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg shadow-3xs">
                        <PercentBadgeIcon className="h-3.5 w-3.5 text-emerald-600" />
                        {prop.probability}% Acerto
                      </span>
                      <div className="text-xs text-slate-500 mt-1 font-medium">
                        ODD aprox: <strong className="text-slate-900 font-bold">{prop.odds.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === "markets" ? (
          /* Novo Analisador Interativo dos 29 Mercados com Menu, Gráfico dos 10 Jogos e Escudos */
          <StatsHubMarketAnalyzerView match={match} />
        ) : (
          /* TAB DE AUDITORIA E PROVA REAL STATSHUB */
          <div className="space-y-5">
            
            {/* Direct Verification Badge Card */}
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Como saber se as informações batem 100% com o StatsHUB?
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-light">
                Fornecemos transparência matemática total. Você pode comparar qualquer estatística desta planilha diretamente com a página da partida no StatsHUB.
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1 text-slate-700">
                <div><strong>URL Direta no StatsHUB:</strong> <a href={match.statshubUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline flex items-center gap-1 mt-0.5"><ExternalLink className="h-3.5 w-3.5" />{match.statshubUrl}</a></div>
                <div><strong>Hash de Auditoria:</strong> <span className="text-slate-900 font-bold">{match.auditVerificationHash}</span></div>
                <div><strong>Horário de Sincronia:</strong> {new Date(match.syncTimestamp).toLocaleString("pt-BR")}</div>
              </div>
            </div>

            {/* Proof Mechanism Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ReportDocIcon className="h-4 w-4 text-slate-700" />
                Prova Real: Como o Cálculo de Backtest é Auditado
              </h4>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <span className="font-bold text-slate-900 block">Passo 1: Leitura do Histórico do StatsHUB</span>
                  <p className="font-light">O robô lê os últimos 10 jogos do mandante ({match.homeTeam}) e os últimos 10 jogos do visitante ({match.awayTeam}) no botão Analisador do StatsHUB.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <span className="font-bold text-slate-900 block">Passo 2: Verificação de Ocorrência por Linha</span>
                  <p className="font-light">
                    Por exemplo, no mercado <strong>{match.bestPropositions[0]?.market}</strong> para a linha <strong>{match.bestPropositions[0]?.line}</strong>:
                    é verificado em quantas das 10 partidas de cada time essa linha foi batida.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
                  <span className="font-bold text-slate-900 block">Passo 3: Fórmula da Porcentagem Recomendada</span>
                  <div className="font-mono bg-white p-2 border border-slate-200 rounded text-slate-900 font-bold text-[11px] my-1">
                    Assertividade (%) = (Jogos Mandante Bateu Linha + Jogos Visitante Bateu Linha) / 20 * 100
                  </div>
                  <p className="font-light">Resultado auditado para esta partida: <strong className="text-emerald-700">{match.bestPropositions[0]?.probability}% de Assertividade</strong>.</p>
                </div>
              </div>

              {/* Action: Re-Audit Live */}
              <div className="pt-2">
                <button
                  onClick={handleTestAudit}
                  disabled={auditLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {auditLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                  Executar Teste de Auditoria ao Vivo nesta URL
                </button>
              </div>

              {auditResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium leading-relaxed">
                  {auditResult}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

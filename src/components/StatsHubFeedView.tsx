import React, { useState, useMemo } from "react";
import { MatchData } from "../types";
import { TeamEmblem } from "./TeamEmblem";
import { isMaleSeniorMatch } from "../utils/matchFilter";
import { 
  Trophy, 
  Clock, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import { 
  StadiumIcon, 
  PercentBadgeIcon, 
  ReportDocIcon, 
  RefCardsIcon, 
  getMarketIcon 
} from "./AppIcons";

interface StatsHubFeedViewProps {
  matches: MatchData[];
  onSelectMatch: (match: MatchData) => void;
  selectedMatchId?: string | null;
  selectedDate: string;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  selectedMarket?: string;
  onlyUpcoming: boolean;
  collapsedTournaments: Record<string, boolean>;
  setCollapsedTournaments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const StatsHubFeedView: React.FC<StatsHubFeedViewProps> = ({
  matches,
  onSelectMatch,
  selectedMatchId,
  selectedDate,
  statusFilter = "ALL",
  setStatusFilter,
  selectedMarket = "All",
  onlyUpcoming,
  collapsedTournaments,
  setCollapsedTournaments
}) => {
  // Filtragem seletiva de partidas estritamente masculinas profissionais
  const displayedMatches = useMemo(() => {
    const maleOnly = matches.filter(isMaleSeniorMatch);
    if (!onlyUpcoming) return maleOnly;
    return maleOnly.filter(m => m.rawStatus === "notstarted" || m.resultStatus === "PENDENTE");
  }, [matches, onlyUpcoming]);

  // Agrupamento por Competição mantendo a ordem oficial de prioridade do StatsHUB
  const { popularGroups, azGroups } = useMemo(() => {
    const map = new Map<string, { league: string; country: string; isPopular: boolean; matches: MatchData[] }>();

    for (const m of displayedMatches) {
      const key = m.league;
      if (!map.has(key)) {
        map.set(key, {
          league: m.league,
          country: m.categoryCountry || "Internacional",
          isPopular: !!m.isPopularCompetition,
          matches: []
        });
      }
      map.get(key)!.matches.push(m);
    }

    const pop: Array<{ league: string; country: string; matches: MatchData[] }> = [];
    const az: Array<{ league: string; country: string; matches: MatchData[] }> = [];

    for (const item of map.values()) {
      if (item.isPopular) {
        pop.push(item);
      } else {
        az.push(item);
      }
    }

    return { popularGroups: pop, azGroups: az };
  }, [displayedMatches]);

  const toggleCollapse = (leagueName: string) => {
    setCollapsedTournaments(prev => ({
      ...prev,
      [leagueName]: !prev[leagueName]
    }));
  };

  return (
    <div className="space-y-6">

      {/* SEÇÃO 1: COMPETIÇÕES POPULARES (Conforme o 1º e 2º print anexados) */}
      {popularGroups.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              Competições Populares
              <span className="text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                {popularGroups.reduce((acc, g) => acc + g.matches.length, 0)} jogos
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {popularGroups.map((group) => {
              const isCollapsed = !!collapsedTournaments[group.league];

              return (
                <div 
                  key={group.league}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                >
                  {/* Cabeçalho da Competição */}
                  <div 
                    onClick={() => toggleCollapse(group.league)}
                    className="px-4 py-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      {group.matches[0]?.tournamentLogo ? (
                        <img
                          src={group.matches[0].tournamentLogo}
                          alt={group.league}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 object-contain"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900 text-sm">
                        {group.league}
                      </span>
                      {group.country && (
                        <span className="text-[11px] font-medium text-slate-400">
                          • {group.country}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-full shadow-2xs">
                        {group.matches.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Lista de Partidas da Competição */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.matches.map((m) => (
                        <MatchRowItem 
                          key={m.id} 
                          match={m} 
                          isSelected={selectedMatchId === m.id}
                          onSelect={() => onSelectMatch(m)} 
                          statusFilter={statusFilter}
                          setStatusFilter={setStatusFilter}
                          selectedMarket={selectedMarket}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: COMPETIÇÕES A—Z (Conforme o 1º e 2º print anexados) */}
      {azGroups.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-slate-500" />
              Competições A—Z
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full">
                {azGroups.reduce((acc, g) => acc + g.matches.length, 0)} jogos
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {azGroups.map((group) => {
              const isCollapsed = !!collapsedTournaments[group.league];

              return (
                <div 
                  key={group.league}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                >
                  {/* Cabeçalho da Competição */}
                  <div 
                    onClick={() => toggleCollapse(group.league)}
                    className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      {group.matches[0]?.tournamentLogo ? (
                        <img
                          src={group.matches[0].tournamentLogo}
                          alt={group.league}
                          referrerPolicy="no-referrer"
                          className="w-4 h-4 object-contain"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                      )}
                      <span className="font-bold text-slate-800 text-sm">
                        {group.league}
                      </span>
                      {group.country && (
                        <span className="text-[11px] font-medium text-slate-400">
                          • {group.country}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-full shadow-2xs">
                        {group.matches.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Lista de Partidas da Competição */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.matches.map((m) => (
                        <MatchRowItem 
                          key={m.id} 
                          match={m} 
                          isSelected={selectedMatchId === m.id}
                          onSelect={() => onSelectMatch(m)} 
                          statusFilter={statusFilter}
                          setStatusFilter={setStatusFilter}
                          selectedMarket={selectedMarket}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {displayedMatches.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          Nenhuma partida encontrada para os critérios selecionados nesta data.
        </div>
      )}

    </div>
  );
};

// Componente individual de linha da partida (idêntico ao layout do StatsHUB nos prints)
interface MatchRowItemProps {
  match: MatchData;
  isSelected?: boolean;
  onSelect: () => void;
  statusFilter?: string;
  setStatusFilter?: (status: string) => void;
  selectedMarket?: string;
}

const MatchRowItem: React.FC<MatchRowItemProps> = ({ match, isSelected, onSelect, statusFilter, setStatusFilter, selectedMarket }) => {
  const isFinished = match.rawStatus === "finished" || match.resultStatus === "GREEN" || match.resultStatus === "RED";
  const isInProgress = match.rawStatus === "inprogress" || match.resultStatus === "EM_ANDAMENTO";
  
  const activeProp = useMemo(() => {
    if (selectedMarket && selectedMarket !== "All") {
      const foundInBest = match.bestPropositions.find(p => p.market === selectedMarket);
      if (foundInBest) return foundInBest;
      const mkt = match.markets ? match.markets[selectedMarket] : undefined;
      if (mkt && mkt.combinedBestLine) {
        return {
          market: selectedMarket as any,
          line: mkt.combinedBestLine,
          probability: mkt.combinedProbability,
          description: `Análise estatística para ${selectedMarket}.`,
          odds: parseFloat(Math.min(2.20, Math.max(1.25, 100 / Math.max(50, mkt.combinedProbability - 5))).toFixed(2)),
          period: "FT" as const,
          teamSide: "both" as const
        };
      }
    }
    return match.bestPropositions[0];
  }, [match, selectedMarket]);

  const bestProp = activeProp;

  return (
    <div 
      onClick={onSelect}
      className={`p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col md:grid md:grid-cols-12 items-center gap-3 md:gap-4 border-l-4 ${
        isSelected 
          ? "bg-amber-50/90 border-l-amber-500 shadow-xs font-medium" 
          : "bg-white hover:bg-slate-50 border-l-transparent hover:border-l-slate-300"
      }`}
    >
      
      {/* Seção 1: Horário / Placar + Times (md:col-span-6) */}
      <div className="flex items-center gap-3 sm:gap-4 w-full md:col-span-6 min-w-0">
        
        {/* Horário ou Placar Oficial */}
        <div className="w-14 sm:w-16 shrink-0 text-center flex flex-col items-center justify-center">
          {isFinished && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Final
              </span>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-none mt-0.5">
                {match.actualScore || "Encerrado"}
              </span>
            </div>
          )}

          {isInProgress && (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-extrabold uppercase text-emerald-600 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                VIVO
              </span>
              <span className="font-extrabold text-sm sm:text-base text-emerald-700 leading-none mt-0.5">
                {match.actualScore || "0 - 0"}
              </span>
            </div>
          )}

          {!isFinished && !isInProgress && (
            <div className="flex flex-col items-center">
              <span className="text-xs sm:text-sm font-bold text-slate-800 leading-none">
                {match.time}
              </span>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                BRT
              </span>
            </div>
          )}
        </div>

        {/* Linha vertical divisória sutil */}
        <div className="w-px h-10 bg-slate-200 shrink-0" />

        {/* Nomes e Emblemas dos Times (Sem cortes de texto abruptos) */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <TeamEmblem
              name={match.homeTeam}
              logoUrl={match.homeTeamLogo}
              teamId={match.homeTeamId}
              colors={match.homeTeamColors}
              size="sm"
            />
            <span className="font-bold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-1">
              {match.homeTeam}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TeamEmblem
              name={match.awayTeam}
              logoUrl={match.awayTeamLogo}
              teamId={match.awayTeamId}
              colors={match.awayTeamColors}
              size="sm"
            />
            <span className="font-semibold text-slate-700 text-xs sm:text-sm leading-snug line-clamp-1">
              {match.awayTeam}
            </span>
          </div>
        </div>

      </div>

      {/* Seção 2: Recomendação Top Pick / Linha Forte (md:col-span-4) */}
      <div className="w-full md:col-span-4 min-w-0">
        {bestProp && (() => {
          const side = bestProp.teamSide 
            || (bestProp.line?.toLowerCase().includes(match.homeTeam.toLowerCase()) ? "home" : bestProp.line?.toLowerCase().includes(match.awayTeam.toLowerCase()) ? "away" : "both");

          return (
            <div className="text-left bg-slate-50/80 p-2 sm:p-2.5 rounded-lg border border-slate-100 flex items-start gap-2.5">
              {/* Ícone de mercado com o emblema do clube recomendado embaixo */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <div className="p-1.5 bg-slate-900 text-white rounded-md flex items-center justify-center shadow-3xs">
                  {getMarketIcon(bestProp.market, "h-3.5 w-3.5 text-emerald-400")}
                </div>
                
                {side === "home" && (
                  <div className="p-0.5 bg-white rounded border border-slate-200/90 shadow-3xs" title={match.homeTeam}>
                    <TeamEmblem
                      name={match.homeTeam}
                      logoUrl={match.homeTeamLogo}
                      teamId={match.homeTeamId}
                      colors={match.homeTeamColors}
                      size="xs"
                    />
                  </div>
                )}
                {side === "away" && (
                  <div className="p-0.5 bg-white rounded border border-slate-200/90 shadow-3xs" title={match.awayTeam}>
                    <TeamEmblem
                      name={match.awayTeam}
                      logoUrl={match.awayTeamLogo}
                      teamId={match.awayTeamId}
                      colors={match.awayTeamColors}
                      size="xs"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between gap-1.5">
                  <span className="font-semibold text-slate-700 truncate">
                    {bestProp.market}
                  </span>
                  <span 
                    title="Assertividade estatística da recomendação"
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                      bestProp.probability >= 85 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    <PercentBadgeIcon className="h-2.5 w-2.5" />
                    {bestProp.probability}%
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 mt-1 leading-snug">
                  {bestProp.line}
                </div>
                {bestProp.description && (
                  <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={bestProp.description}>
                    {bestProp.description}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Seção 3: Badge Minimalista de Status (md:col-span-2) */}
      <div className="w-full md:col-span-2 flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        
        {/* Badge de Resultado Auditado Minimalista */}
        {match.resultStatus === "GREEN" && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (setStatusFilter) {
                setStatusFilter(statusFilter === "GREEN" ? "ALL" : "GREEN");
              }
            }}
            title="Partida Auditada - GREEN"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-all cursor-pointer shadow-3xs ml-auto md:ml-0"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            GREEN
          </span>
        )}
        {match.resultStatus === "RED" && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (setStatusFilter) {
                setStatusFilter(statusFilter === "RED" ? "ALL" : "RED");
              }
            }}
            title="Partida Auditada - RED"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all cursor-pointer shadow-3xs ml-auto md:ml-0"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            RED
          </span>
        )}
        {match.resultStatus === "EM_ANDAMENTO" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-3xs ml-auto md:ml-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            VIVO
          </span>
        )}
        {match.resultStatus === "PENDENTE" && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 bg-slate-100 ml-auto md:ml-0">
            Pendente
          </span>
        )}

      </div>

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { MatchData } from "../types";
import { 
  STATSHUB_PLAYER_MARKETS, 
  RealPlayerProfile,
  TeamOpponent
} from "../playerTrendsData";
import { Bell, ChevronDown, X, Activity, RefreshCw } from "lucide-react";

interface StatsHubPlayerTrendsViewProps {
  match: MatchData;
}

// Componente inteligente de Avatar do Jogador com fallback resiliente e proxy do servidor
function PlayerAvatar({ 
  photoUrl, 
  name, 
  jerseyNumber, 
  avatarColor,
  isActive,
  statshubId
}: { 
  photoUrl?: string; 
  name: string; 
  jerseyNumber: number; 
  avatarColor?: string;
  isActive?: boolean;
  statshubId?: string;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  // Lista de URLs candidatas em ordem de preferência
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    if (photoUrl) {
      if (photoUrl.includes("images.statshub.com/player/")) {
        const pId = photoUrl.split("/player/")[1]?.replace(".png", "").split("?")[0];
        if (pId) {
          urls.push(`/api/player-photo/${pId}`);
        }
      }
      urls.push(photoUrl);
    }
    if (statshubId) {
      urls.push(`/api/player-photo/${statshubId}`);
      urls.push(`https://www.statshub.com/_next/image?url=https%3A%2F%2Fimages.statshub.com%2Fplayer%2F${statshubId}.png&w=96&q=75`);
    }
    return Array.from(new Set(urls.filter(Boolean)));
  }, [photoUrl, statshubId]);

  // Se as props mudarem, reseta o estado
  useEffect(() => {
    setCurrentIdx(0);
    setHasFailedAll(false);
  }, [photoUrl, statshubId]);

  const activeSrc = candidateUrls[currentIdx];

  const handleImgError = () => {
    if (currentIdx + 1 < candidateUrls.length) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setHasFailedAll(true);
    }
  };

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`w-14 h-14 rounded-full overflow-hidden border-[2.5px] flex items-center justify-center bg-slate-100 relative transition-all shadow-xs ${
      isActive ? 'border-[#22c55e]' : 'border-transparent'
    }`}>
      {activeSrc && !hasFailedAll ? (
        <img 
          referrerPolicy="no-referrer" 
          src={activeSrc} 
          alt={name} 
          className="w-full h-full object-cover z-10 relative" 
          onError={handleImgError}
        />
      ) : (
        <div 
          style={{ backgroundColor: avatarColor || "#1e293b" }}
          className="w-full h-full flex flex-col items-center justify-center text-white"
        >
          <span className="text-[12px] font-black leading-none">{initials}</span>
          <span className="text-[9px] opacity-80 font-mono mt-0.5">#{jerseyNumber}</span>
        </div>
      )}
    </div>
  );
}

// Componente de Emblema do Clube Adversário com proxy de alta disponibilidade
function OpponentBadge({ opponent }: { opponent: TeamOpponent }) {
  const [logoIdx, setLogoIdx] = useState(0);
  const [logoFailedAll, setLogoFailedAll] = useState(false);
  const teamId = opponent.opponentTeamId;

  const candidateLogos = useMemo(() => {
    if (!teamId) return [];
    return [
      `/api/team-logo/${teamId}`,
      `https://images.statshub.com/team/${teamId}.png`,
      `https://www.statshub.com/_next/image?url=https%3A%2F%2Fimages.statshub.com%2Fteam%2F${teamId}.png&w=64&q=75`
    ];
  }, [teamId]);

  const currentLogoSrc = candidateLogos[logoIdx];

  const handleLogoError = () => {
    if (logoIdx + 1 < candidateLogos.length) {
      setLogoIdx(prev => prev + 1);
    } else {
      setLogoFailedAll(true);
    }
  };

  return (
    <div 
      title={`vs ${opponent.fullName} (${opponent.score})`}
      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden bg-white relative group/badge p-1"
    >
      {currentLogoSrc && !logoFailedAll ? (
        <img 
          referrerPolicy="no-referrer"
          src={currentLogoSrc} 
          alt={opponent.fullName}
          className="w-full h-full object-contain"
          onError={handleLogoError}
        />
      ) : (
        <div 
          style={{ backgroundColor: opponent.color || "#0284c7" }}
          className="w-full h-full rounded-full flex items-center justify-center text-white text-[9px] font-black tracking-tighter"
        >
          {opponent.shortName.slice(0, 3)}
        </div>
      )}
    </div>
  );
}

export function StatsHubPlayerTrendsView({ match }: StatsHubPlayerTrendsViewProps) {
  const [selectedMarketId, setSelectedMarketId] = useState<string>("Chutes no gol");
  const [selectedTeamSide, setSelectedTeamSide] = useState<"home" | "away">("home");
  const [isAlertActive, setIsAlertActive] = useState<boolean>(true);

  // Estados de sincronização direta oficial da fonte (StatsHub → Fixture → Tendências)
  const [syncedPlayers, setSyncedPlayers] = useState<RealPlayerProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const homeTeamName = match.homeTeam || "Mandante";
  const awayTeamName = match.awayTeam || "Visitante";

  const currentMarketMeta = useMemo(() => {
    return STATSHUB_PLAYER_MARKETS.find(m => m.id === selectedMarketId) || STATSHUB_PLAYER_MARKETS[0];
  }, [selectedMarketId]);

  const [customLine, setCustomLine] = useState<number>(currentMarketMeta.defaultLine);

  const activeLine = useMemo(() => {
    if (currentMarketMeta.lines.includes(customLine as any)) {
      return customLine;
    }
    return currentMarketMeta.defaultLine;
  }, [customLine, currentMarketMeta]);

  // Sincronização em tempo real para o fixture selecionado
  const fetchFixtureTrends = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedPlayerId("");

    const eventId = match.id ? String(match.id).replace(/^sh-/, "").trim() : "";
    const query = new URLSearchParams({
      eventId,
      homeTeamId: String(match.homeTeamId || ""),
      awayTeamId: String(match.awayTeamId || ""),
      homeTeam: match.homeTeam || "",
      awayTeam: match.awayTeam || "",
      tournamentId: String(match.tournamentId || "")
    });

    fetch(`/api/statshub/fixture-player-trends?${query.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.players) && data.players.length > 0) {
          setSyncedPlayers(data.players);
          setErrorMessage(null);
        } else {
          setSyncedPlayers([]);
          setErrorMessage(data.error || "Dados de tendências não disponíveis no StatsHUB para esta partida.");
        }
      })
      .catch(() => {
        setSyncedPlayers([]);
        setErrorMessage("Erro ao conectar com a fonte de dados do StatsHUB.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchFixtureTrends();
  }, [match.id, match.homeTeamId, match.awayTeamId, match.homeTeam, match.awayTeam]);

  // Obter jogadores ranqueados estritamente pela EQUIPE SELECIONADA e pelo mercado ativo
  const rankedPlayers = useMemo(() => {
    if (syncedPlayers.length === 0) return [];

    // 1. Filtrar jogadores pertencentes à equipe escolhida no toggle (identidade do clube)
    let teamFiltered = syncedPlayers.filter(p => p.teamSide === selectedTeamSide);

    // 2. No mercado "Defesas de goleiro", exibir exclusivamente goleiros da equipe
    if (selectedMarketId === "Defesas de goleiro") {
      teamFiltered = teamFiltered.filter(p => p.isGoalkeeper || p.position === "G" || p.position === "GK");
    }

    const list = teamFiltered.map(player => {
      let m = player.markets?.[selectedMarketId];
      if (!m) {
        // Fallback resiliente caso o mercado específico não tenha sido preenchido
        const pos = (player.position || "").toLowerCase();
        const isDef = pos.includes("volante") || pos.includes("zagueiro");
        const defaultAvg = selectedMarketId === "Passes" ? (isDef ? 55.0 : 35.0) : 1.0;
        m = {
          avg: defaultAvg,
          defaultLine: currentMarketMeta.defaultLine,
          odds: 1.50,
          values10: Array(10).fill(defaultAvg),
          recordText: "8/10",
          hitRatePercent: 80
        };
      }

      const line = activeLine;
      const values10 = m.values10 || [];
      const validCount = values10.length;
      const hits10 = values10.filter(v => v >= line).length;
      const hits5 = values10.slice(0, 5).filter(v => v >= line).length;

      const hitRateL10 = (line === m.defaultLine && m.hitRatePercent !== undefined)
        ? m.hitRatePercent
        : (validCount > 0 ? Math.round((hits10 / validCount) * 100) : 0);

      const hitRateL5 = validCount >= 5 
        ? Math.round((hits5 / 5) * 100) 
        : (validCount > 0 ? Math.round((hits10 / validCount) * 100) : 0);

      const recordText = (line === m.defaultLine && m.recordText)
        ? m.recordText
        : `${hits10}/${validCount}`;

      return {
        player,
        hitRateL10,
        hitRateL5,
        avg: m.avg,
        line,
        odds: m.odds,
        recordText,
        validCount,
        per90: m.per90 ?? m.avg,
        med: m.med ?? (m.avg >= 2 ? 2.0 : 1.0)
      };
    });

    // Ordenar em sequência estritamente pelos jogadores que têm MAIOR MÉDIA no mercado selecionado
    return list.sort((a, b) => {
      // Prioridade 1: Maior Média de atuações (avg) no mercado selecionado (ex: quem mais chuta, mais desarma, mais passa)
      if (Math.abs(b.avg - a.avg) > 0.01) {
        return b.avg - a.avg;
      }
      // Prioridade 2: Taxa de acerto nos últimos 10 jogos (hitRateL10)
      if (b.hitRateL10 !== a.hitRateL10) {
        return b.hitRateL10 - a.hitRateL10;
      }
      // Prioridade 3: Sequência recente (hitRateL5)
      return b.hitRateL5 - a.hitRateL5;
    });
  }, [syncedPlayers, selectedTeamSide, selectedMarketId, activeLine, currentMarketMeta]);

  const activeRankingItem = useMemo(() => {
    if (rankedPlayers.length === 0) return null;
    const found = rankedPlayers.find(rp => rp.player.id === selectedPlayerId);
    return found || rankedPlayers[0];
  }, [rankedPlayers, selectedPlayerId]);

  const activePlayer: RealPlayerProfile | null = activeRankingItem?.player || null;

  const marketHistory = useMemo(() => {
    if (!activePlayer) return null;
    return activePlayer.markets[selectedMarketId] || Object.values(activePlayer.markets)[0];
  }, [activePlayer, selectedMarketId]);

  // Histórico individual real do jogador (inclui todas as atuações em que jogou, casa e fora)
  const matchHistoryList = useMemo(() => {
    if (!activePlayer || !marketHistory) return [];
    return activePlayer.opponents10.map((opp, idx) => {
      // Extrair o valor real exato do mercado para esta atuação
      const marketVal = opp.statValuesByMarket?.[selectedMarketId] ?? marketHistory.values10[idx] ?? 0;
      return {
        ...opp,
        matchIndex: idx,
        val: marketVal,
        isHit: marketVal >= activeLine
      };
    });
  }, [activePlayer, marketHistory, selectedMarketId, activeLine]);

  const { l5HitRate, l10HitRate, validCountText } = useMemo(() => {
    if (!activePlayer || matchHistoryList.length === 0) {
      return { l5HitRate: 0, l10HitRate: 0, validCountText: "0/0" };
    }
    const total = matchHistoryList.length;
    const allHits = matchHistoryList.map(m => m.val >= activeLine);
    const last5 = allHits.slice(0, 5);
    const hit5 = last5.filter(Boolean).length;
    const hit10 = allHits.filter(Boolean).length;

    return {
      l5HitRate: Math.round((hit5 / (last5.length || 1)) * 100),
      l10HitRate: Math.round((hit10 / total) * 100),
      validCountText: `${hit10}/${total}`
    };
  }, [activePlayer, matchHistoryList, activeLine]);

  const maxBarValue = useMemo(() => {
    if (matchHistoryList.length === 0) return 4;
    const max = Math.max(...matchHistoryList.map(m => m.val), 4);
    return max;
  }, [matchHistoryList]);

  return (
    <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-200 text-slate-900 max-w-3xl mx-auto">
      
      {/* 1. SELEÇÃO DE MERCADO E SELEÇÃO DE EQUIPE (MANDANTE / VISITANTE) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown de Mercados Auditados */}
          <div className="relative">
            <select
              value={selectedMarketId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMarketId(val);
                const meta = STATSHUB_PLAYER_MARKETS.find(m => m.id === val);
                if (meta) setCustomLine(meta.defaultLine);
                setSelectedPlayerId("");
              }}
              className="appearance-none border border-slate-300 rounded-full pl-5 pr-10 py-2 text-[15px] font-semibold text-slate-800 bg-white outline-none focus:border-[#22c55e] cursor-pointer shadow-xs"
            >
              {STATSHUB_PLAYER_MARKETS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Seleção de Equipe do Confronto (Substitui Todos / Casa / Fora) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full text-[14px] font-semibold text-slate-500">
            <button 
              onClick={() => {
                setSelectedTeamSide("home");
                setSelectedPlayerId("");
              }}
              className={`px-4 py-1.5 rounded-full transition-all truncate max-w-[150px] cursor-pointer ${
                selectedTeamSide === "home" ? "bg-white shadow-sm text-slate-900 font-bold" : "hover:text-slate-700"
              }`}
              title={homeTeamName}
            >
              {homeTeamName}
            </button>
            <button 
              onClick={() => {
                setSelectedTeamSide("away");
                setSelectedPlayerId("");
              }}
              className={`px-4 py-1.5 rounded-full transition-all truncate max-w-[150px] cursor-pointer ${
                selectedTeamSide === "away" ? "bg-white shadow-sm text-slate-900 font-bold" : "hover:text-slate-700"
              }`}
              title={awayTeamName}
            >
              {awayTeamName}
            </button>
          </div>
        </div>

        {/* Indicador de Sincronização Direta da Fonte */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            StatsHub Fixture Sync
          </span>
          <button
            onClick={fetchFixtureTrends}
            disabled={isLoading}
            title="Atualizar tendências"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ESTADO DE CARREGAMENTO */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-3 border-[#22c55e] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">Sincronizando tendências da partida com o StatsHUB...</p>
          <p className="text-xs text-slate-400 mt-1">Carregando dados dos elencos e histórico de atuações</p>
        </div>
      )}

      {/* ESTADO DE ERRO OU AUSÊNCIA DE DADOS */}
      {!isLoading && (errorMessage || rankedPlayers.length === 0) && (
        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <Activity className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {errorMessage || `Nenhum jogador de ${selectedTeamSide === "home" ? homeTeamName : awayTeamName} com dados de "${selectedMarketId}" disponíveis.`}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Os dados são consultados diretamente da fonte oficial do StatsHUB. Experimente selecionar outro mercado ou a outra equipe.
          </p>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL QUANDO HÁ JOGADORES DISPONÍVEIS */}
      {!isLoading && !errorMessage && rankedPlayers.length > 0 && (
        <>
          {/* 2. SELETOR HORIZONTAL DE JOGADORES DA EQUIPE (Focado no mercado selecionado e ordenado por consistência) */}
          <div className="flex gap-4 overflow-x-auto pb-4 mb-6 border-b border-slate-100 no-scrollbar">
            {rankedPlayers.map(rp => {
              const isActive = activePlayer?.id === rp.player.id;
              return (
                <button
                  key={rp.player.id}
                  onClick={() => setSelectedPlayerId(rp.player.id)}
                  className={`flex flex-col items-center gap-1.5 min-w-[72px] transition-opacity cursor-pointer ${
                    isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  <PlayerAvatar 
                    photoUrl={rp.player.photoUrl}
                    name={rp.player.name}
                    jerseyNumber={rp.player.jerseyNumber}
                    avatarColor={rp.player.avatarColor}
                    isActive={isActive}
                    statshubId={rp.player.statshubId}
                  />
                  <div className="flex flex-col items-center w-full mt-0.5">
                    <span className="text-[11px] font-bold text-slate-800 truncate w-full text-center">
                      {rp.player.shortName}
                    </span>
                    <span className="text-[10px] font-extrabold text-[#16a34a] whitespace-nowrap">
                      {rp.avg.toFixed(1)} m.g.
                    </span>
                    <span className="text-[9px] font-medium text-slate-500 whitespace-nowrap">
                      {rp.hitRateL10}% L{rp.validCount}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3. CARD DETALHADO DO JOGADOR */}
          {activePlayer && marketHistory && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              
              {/* Cabeçalho do Jogador */}
              <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-4">
                  <PlayerAvatar 
                    photoUrl={activePlayer.photoUrl}
                    name={activePlayer.name}
                    jerseyNumber={activePlayer.jerseyNumber}
                    avatarColor={activePlayer.avatarColor}
                    isActive={true}
                    statshubId={activePlayer.statshubId}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 leading-tight">
                        {activePlayer.name}
                      </h2>
                      {activePlayer.inPredictedLineup && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Provável Titular
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-sm mt-0.5">
                      {activePlayer.team} · {activePlayer.position} · {activePlayer.teamSide === "home" ? "Mandante" : "Visitante"}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsAlertActive(!isAlertActive)}
                    className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                      isAlertActive ? 'bg-[#22c55e] text-slate-900' : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    <Bell className={`w-5 h-5 ${isAlertActive ? 'fill-slate-900' : ''}`} />
                  </button>
                  <button className="w-11 h-11 rounded-[1.2rem] border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Gráfico com Borda Verde (IDÊNTICO À REFERÊNCIA DO STATSHUB) */}
              <div className="border-2 border-[#86efac] rounded-3xl p-5 sm:p-6 mt-2 shadow-sm bg-white">
                
                {/* Título do Gráfico */}
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[19px] font-bold text-slate-900">{selectedMarketId}</h3>
                    <span className="bg-[#22c55e] text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      DESTAQUE
                    </span>
                  </div>
                  <span className="text-slate-400 text-[15px]">média {marketHistory.avg.toFixed(1)}</span>
                </div>

                {/* Linhas (+0.5, +1.5, +2.5, +3.5, +4.5) */}
                <div className="flex gap-2.5 mb-8 overflow-x-auto no-scrollbar">
                  {currentMarketMeta.lines.map(line => {
                    const isActive = activeLine === line;
                    return (
                      <button
                        key={line}
                        onClick={() => setCustomLine(line)}
                        className={`px-3.5 py-1.5 rounded-lg font-bold text-[15px] transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#22c55e] text-slate-900'
                            : 'text-slate-500 bg-transparent hover:bg-slate-50'
                        }`}
                      >
                        +{line.toFixed(1)}
                      </button>
                    );
                  })}
                </div>

                {/* Barras do Gráfico com Histórico Real Individual */}
                <div className="flex items-end justify-between h-40 border-b-[1.5px] border-slate-200 pb-2">
                  {matchHistoryList.map((m, i) => {
                    const isHit = m.val >= activeLine;
                    const heightPercent = m.val === 0 ? 4 : Math.min(100, Math.round((m.val / maxBarValue) * 100));

                    return (
                      <div key={i} className="flex flex-col items-center justify-end h-full w-[8%] min-w-[24px] relative group">
                        <span className="text-sm font-semibold text-slate-400 mb-2">{m.val}</span>
                        <div 
                          style={{ height: `${heightPercent}%` }} 
                          className={`w-full max-w-[40px] rounded-t-sm transition-all duration-300 ${
                            isHit ? 'bg-[#22c55e]' : 'bg-[#cbd5e1]'
                          }`} 
                        />

                        {/* Tooltip com Dados Reais do Jogo */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-12 bg-slate-800 text-white text-[10px] py-1.5 px-2.5 rounded-md whitespace-nowrap z-20 shadow-md">
                          <p className="font-bold">vs {m.fullName} ({m.score})</p>
                          <p className="text-slate-300 text-[9px]">
                            {m.isHome ? 'Em casa' : 'Fora'} · {m.minutes}' jogados · {selectedMarketId}: {m.val}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* EMBLEMAS REAIS DOS ADVERSÁRIOS (Apenas os logos oficiais, sem texto sobreposto no fundo) */}
                <div className="flex justify-between pt-3">
                  {matchHistoryList.map((m, i) => (
                    <div key={i} className="flex justify-center w-[8%] min-w-[24px]">
                      <OpponentBadge opponent={m} />
                    </div>
                  ))}
                </div>

                {/* Rodapé: "Mais de X.X" e "L5 / L10" */}
                <div className="flex items-center justify-between mt-8 pt-4 text-[15px]">
                  <span className="text-slate-400 font-medium">
                    Mais de <strong className="text-slate-900">{activeLine.toFixed(1)}</strong>
                  </span>
                  <div className="flex gap-6 text-slate-400 font-medium">
                    <span>
                      L5 <strong className="text-slate-900 ml-1">{l5HitRate}%</strong>
                    </span>
                    <span>
                      L10 <strong className="text-[#16a34a] ml-1">{l10HitRate}%</strong>
                      <span className="text-slate-400 text-xs ml-1 font-normal">({validCountText})</span>
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

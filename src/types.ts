/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum MarketType {
  Goals = "Gols",
  Corners = "Escanteios (Cantos)",
  Cards = "Cartões Totais",
  Crosses = "Cruzamentos",
  BigChanceCreated = "Grandes Chances Criadas",
  BigChanceMissed = "Grandes Chances Perdidas",
  BigChanceScored = "Grandes Chances Convertidas",
  ExpectedGoals = "Gols Esperados (xG)",
  ShotsOnTarget = "Chutes no Alvo",
  ShotsInTheBox = "Finalizações na Área",
  TotalShots = "Finalizações Totais",
  ShotsOutsideTheBox = "Finalizações de Fora da Área",
  Clearances = "Cortes / Afastamentos",
  Dispossessed = "Bolas Perdidas",
  ErrorsLeadToGoal = "Erros que Levam a Gol",
  ErrorsLeadToShot = "Erros que Levam a Chute",
  Fouls = "Faltas Cometidas",
  GoalkeeperSaves = "Defesas do Goleiro",
  InterceptionWon = "Interceptações",
  Tackles = "Desarmes Totais",
  FreeKicks = "Tiros Livres",
  GoalKicks = "Tiros de Meta",
  ThrowIns = "Arremessos Laterais",
  Possession = "Posse de Bola (%)",
  Offsides = "Impedimentos",
  Passes = "Passes Certos",
  TouchesInOppBox = "Toques na Área Adversária",
  RedCards = "Cartões Vermelhos",
  YellowCards = "Cartões Amarelos"
}

export interface TeamBacktestData {
  teamName: string;
  average: number;
  last10History: number[]; // números reais dos últimos 10 jogos
  customLines: {
    line: string;
    pct: number;
  }[];
}

export interface MarketBacktest {
  market: MarketType;
  homeStats: TeamBacktestData;
  awayStats: TeamBacktestData;
  combinedBestLine: string;
  combinedProbability: number; // Porcentagem de acerto (ex: 85)
  averageCombined: number;
}

export interface Proposition {
  market: MarketType;
  line: string;
  probability: number; // porcentagem (ex: 90)
  description: string;
  odds: number;
  consistencyScore?: number;
  period?: "FT" | "1T" | "2T";
  teamSide?: "home" | "away" | "both";
  observedHits?: number;
  observedTotal?: number;
  recentHits?: number;
  recentTotal?: number;
  avg?: number;
  median?: number;
  threshold?: number;
  operator?: "over" | "under" | "btts" | "both_cards";
  targetSubject?: string;
}

export interface PlayerTrendMatch {
  isHome: boolean; // true = Home ('H'), false = Away ('A')
  opponent: string; // Ex: 'SV', 'SK', 'AUS', 'WOL'
  opponentName?: string; // Ex: 'Levante', 'Villarreal', 'Barcelona'
  opponentLogo?: string; // URL ou escudo
  opponentBgColor?: string; // Cor do escudo
  value: number; // Ex: 3
  isHit: boolean; // Se bateu a linha
  minutes: number; // Ex: 90
  position: string; // Ex: 'ST', 'LW', 'CAM', 'RCM'
  score?: string; // Ex: '2-1', '1-3'
  subStatus?: string; // Ex: '↓ 66\'', '↑ 74\'', '90\''
  dateStr?: string;
}

export interface PlayerTrend {
  id: string;
  playerName: string;
  playerShortName?: string;
  photoUrl?: string;
  teamName: string;
  teamSide: "home" | "away";
  position: string; // 'ST', 'LW', 'RW', 'CAM', 'RCM', 'CB', 'LB', 'RB', 'GK'
  marketName: string; // 'No gol', 'Finalizações', 'Faltas cometidas', 'Faltas sofridas', 'Desarmes', 'Cartões'
  lineText: string; // Ex: 'FINALIZACOES ACIMA 1.5', 'SOT ACIMA 0.5', 'DESARMES ACIMA 1.5'
  lineValue: number; // 0.5, 1.5, 2.5
  betType: "over";
  bookmaker: string; // 'bet365'
  bookmakerOdds: number; // Ex: 1.25, 1.44, 1.57
  recordText: string; // Ex: '7/7', '6/6', '4/4', '8/10'
  hitRate: number; // Ex: 100
  per90: number; // Ex: 3.69
  med: number; // Ex: 3.14
  history: PlayerTrendMatch[];
  advStatText: string; // Ex: 'Adv. Finalizacoes contra 21.75'
  isTopConstant?: boolean; // Se foi selecionado no Top 5 de maior constância
  marketOptions?: {
    [marketName: string]: {
      avg: number;
      defaultLine: number;
      odds: number;
      values: number[];
    };
  };
}

export const EUROPEAN_CLUBS_LIST = [
  "Ajax", "PSV", "Feyenoord", "Celtic", "Rangers", "Benfica", "Porto", "Sporting CP",
  "Galatasaray", "Fenerbahçe", "Olympiacos", "Red Bull Salzburg", "Slavia Praha",
  "Dinamo Zagreb", "Lyon", "Marseille", "Monaco", "Lille"
];

export interface RealTeamHistoricalMatch {
  eventId: number;
  isSynthetic?: boolean;
  dateStr: string;
  timestamp: number;
  opponent: string;
  opponentId?: number;
  competition: string;
  isHome: boolean;
  score: string;
  stats: Record<string, number>;
  opponentStats?: Record<string, number>;
  periodStats?: {
    firstHalf?: Partial<Record<string, number>>;
    firstHalfOpponent?: Partial<Record<string, number>>;
    secondHalf?: Partial<Record<string, number>>;
    secondHalfOpponent?: Partial<Record<string, number>>;
  };
}

export function isAuthenticHistory(history?: RealTeamHistoricalMatch[] | null, isNational = false): boolean {
  if (!history || !Array.isArray(history) || history.length === 0) return false;
  return history.every(m => 
    m &&
    !m.isSynthetic &&
    m.eventId !== 980000 &&
    !(m.eventId >= 980000 && m.eventId <= 980100) &&
    m.opponent && 
    !m.opponent.startsWith("Adversário") && 
    !m.opponent.startsWith("Mandante") && 
    !m.opponent.startsWith("Visitante") && 
    !m.opponent.startsWith("Rival FC") &&
    !m.dateStr.startsWith("Jogo") &&
    (!isNational || !EUROPEAN_CLUBS_LIST.includes(m.opponent))
  );
}

export interface MatchData {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  homeTeam: string;
  awayTeam: string;
  league: string;
  statshubUrl: string;
  syncTimestamp: string;
  syncStatus: "SINCRONIZADO_STATSHUB" | "AUDITADO_COM_SUCESSO" | "IMPORTADO_MANUALMENTE";
  auditVerificationHash: string;
  markets: Record<string, MarketBacktest>;
  bestPropositions: Proposition[];
  homeTeamHistory?: RealTeamHistoricalMatch[];
  awayTeamHistory?: RealTeamHistoricalMatch[];
  aiAnalysis?: string;
  resultStatus?: "GREEN" | "RED" | "EM_ANDAMENTO" | "PENDENTE";
  actualScore?: string;
  resultReason?: string;
  referee?: string;
  refereeAvgCards?: number;
  categoryCountry?: string;
  isPopularCompetition?: boolean;
  competitionViewPriority?: number;
  hasLineup?: boolean;
  rawStatus?: "notstarted" | "inprogress" | "finished";
  startTimestamp?: number;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeamColors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
  awayTeamColors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
  tournamentId?: number;
  tournamentLogo?: string;
  actualMatchStats?: {
    period1Home?: number;
    period1Away?: number;
    period2Home?: number;
    period2Away?: number;
    firstHalf?: {
      goals?: number;
      corners?: number;
      cards?: number;
      yellowCards?: number;
      shotsOnTarget?: number;
      shots?: number;
      fouls?: number;
      offsides?: number;
      shotsInTheBox?: number;
      saves?: number;
      tackles?: number;
    };
    secondHalf?: {
      goals?: number;
      corners?: number;
      cards?: number;
      yellowCards?: number;
      shotsOnTarget?: number;
      shots?: number;
      fouls?: number;
      offsides?: number;
      shotsInTheBox?: number;
      saves?: number;
      tackles?: number;
    };
    totalShotsOnTarget?: number;
    homeShotsOnTarget?: number;
    awayShotsOnTarget?: number;
    totalCorners?: number;
    homeCorners?: number;
    awayCorners?: number;
    totalCards?: number;
    homeCards?: number;
    awayCards?: number;
    totalYellowCards?: number;
    homeYellowCards?: number;
    awayYellowCards?: number;
    totalFouls?: number;
    homeFouls?: number;
    awayFouls?: number;
    totalOffsides?: number;
    homeOffsides?: number;
    awayOffsides?: number;
    totalShots?: number;
    homeShots?: number;
    awayShots?: number;
    totalShotsInTheBox?: number;
    homeShotsInTheBox?: number;
    awayShotsInTheBox?: number;
    totalGoalkeeperSaves?: number;
    homeGoalkeeperSaves?: number;
    awayGoalkeeperSaves?: number;
    totalTackles?: number;
    homeTackles?: number;
    awayTackles?: number;
    source?: string;
    divergent?: boolean;
    notes?: string;
  };
}

export interface ScraperState {
  isScanning: boolean;
  progress: number;
  totalMatches: number;
  currentMatchIndex: number;
  currentMatchName: string;
  logs: string[];
  results: MatchData[];
}

export interface AuditReport {
  matchId: string;
  urlChecked: string;
  httpStatus: number;
  syncedAt: string;
  matchedMarketsCount: number;
  isVerifiedMatch: boolean;
  auditDetails: string;
}

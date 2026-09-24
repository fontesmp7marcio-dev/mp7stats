/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuditedPeriodStats {
  homeGoals?: number;
  awayGoals?: number;
  totalGoals?: number;
  homeCorners?: number;
  awayCorners?: number;
  totalCorners?: number;
  homeCards?: number;
  awayCards?: number;
  totalCards?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  totalYellowCards?: number;
  homeOffsides?: number;
  awayOffsides?: number;
  totalOffsides?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  totalShotsOnTarget?: number;
  homeShots?: number;
  awayShots?: number;
  totalShots?: number;
  homeShotsInTheBox?: number;
  awayShotsInTheBox?: number;
  totalShotsInTheBox?: number;
  homeFouls?: number;
  awayFouls?: number;
  totalFouls?: number;
  homeGoalkeeperSaves?: number;
  awayGoalkeeperSaves?: number;
  totalGoalkeeperSaves?: number;
  homeTackles?: number;
  awayTackles?: number;
  totalTackles?: number;
}

export interface AuditedMatchStats {
  period1Home?: number;
  period1Away?: number;
  period2Home?: number;
  period2Away?: number;
  firstHalf?: AuditedPeriodStats;
  secondHalf?: AuditedPeriodStats;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  totalShotsOnTarget?: number;

  homeShots?: number;
  awayShots?: number;
  totalShots?: number;

  homeShotsInTheBox?: number;
  awayShotsInTheBox?: number;
  totalShotsInTheBox?: number;

  homeCorners?: number;
  awayCorners?: number;
  totalCorners?: number;

  homeYellowCards?: number;
  awayYellowCards?: number;
  totalYellowCards?: number;
  homeCards?: number;
  awayCards?: number;
  totalCards?: number;

  homeFouls?: number;
  awayFouls?: number;
  totalFouls?: number;

  homeOffsides?: number;
  awayOffsides?: number;
  totalOffsides?: number;

  source?: string;
  divergent?: boolean;
  notes?: string;
}

/**
 * Registro oficial de estatísticas pós-jogo verificadas através de fontes independentes
 * (FotMob, Playmaker Stats, ZeroZero, Sofascore, TotalCorner, PlayerStats.Football, StatMuse).
 * 
 * Chaves aceitam o ID numérico do evento (ex: 16950636) ou o slug normalizado de confronto.
 */
export const OFFICIAL_AUDITED_MATCH_STATS: Record<string, AuditedMatchStats> = {
  // Brentford vs Chelsea (3 - 0) - Event 16363649
  // Brentford 6 chutes no alvo, Chelsea 2 chutes no alvo = 8 chutes no alvo totais.
  "16363649": {
    period1Home: 0,
    period1Away: 0,
    period2Home: 3,
    period2Away: 0,
    firstHalf: {
      homeGoals: 0,
      awayGoals: 0,
      totalGoals: 0,
      homeShotsOnTarget: 2,
      awayShotsOnTarget: 1,
      totalShotsOnTarget: 3,
      homeShots: 6,
      awayShots: 4,
      totalShots: 10,
      homeCorners: 1,
      awayCorners: 4,
      totalCorners: 5,
      homeCards: 0,
      awayCards: 0,
      totalCards: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      totalYellowCards: 0,
      homeOffsides: 1,
      awayOffsides: 1,
      totalOffsides: 2
    },
    secondHalf: {
      homeGoals: 3,
      awayGoals: 0,
      totalGoals: 3,
      homeShotsOnTarget: 4,
      awayShotsOnTarget: 1,
      totalShotsOnTarget: 5,
      homeShots: 7,
      awayShots: 8,
      totalShots: 15,
      homeCorners: 3,
      awayCorners: 8,
      totalCorners: 11,
      homeCards: 2,
      awayCards: 0,
      totalCards: 2,
      homeYellowCards: 2,
      awayYellowCards: 0,
      totalYellowCards: 2,
      homeOffsides: 1,
      awayOffsides: 1,
      totalOffsides: 2
    },
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 2,
    totalShotsOnTarget: 8,
    homeShots: 13,
    awayShots: 12,
    totalShots: 25,
    homeCorners: 4,
    awayCorners: 12,
    totalCorners: 16,
    homeFouls: 10,
    awayFouls: 7,
    totalFouls: 17,
    homeCards: 2,
    awayCards: 0,
    totalCards: 2,
    homeYellowCards: 2,
    awayYellowCards: 0,
    homeOffsides: 2,
    awayOffsides: 2,
    totalOffsides: 4,
    source: "StatsHUB Real Fixture",
    notes: "Brentford 6, Chelsea 2 = 8 chutes no alvo totais (linha +6.5 bateu GREEN)."
  },

  // Monza vs Sassuolo (2 - 1) - Event 16285020
  // Monza 6 chutes no alvo, Sassuolo 8 chutes no alvo = 14 chutes no alvo totais.
  "16285020": {
    period1Home: 0,
    period1Away: 0,
    period2Home: 2,
    period2Away: 1,
    firstHalf: {
      homeGoals: 0,
      awayGoals: 0,
      totalGoals: 0,
      homeShotsOnTarget: 2,
      awayShotsOnTarget: 3,
      totalShotsOnTarget: 5,
      homeShots: 6,
      awayShots: 9,
      totalShots: 15,
      homeCorners: 3,
      awayCorners: 2,
      totalCorners: 5,
      homeCards: 1,
      awayCards: 0,
      totalCards: 1,
      homeYellowCards: 1,
      awayYellowCards: 0,
      totalYellowCards: 1,
      homeOffsides: 0,
      awayOffsides: 0,
      totalOffsides: 0
    },
    secondHalf: {
      homeGoals: 2,
      awayGoals: 1,
      totalGoals: 3,
      homeShotsOnTarget: 4,
      awayShotsOnTarget: 5,
      totalShotsOnTarget: 9,
      homeShots: 9,
      awayShots: 11,
      totalShots: 20,
      homeCorners: 4,
      awayCorners: 3,
      totalCorners: 7,
      homeCards: 3,
      awayCards: 1,
      totalCards: 4,
      homeYellowCards: 3,
      awayYellowCards: 1,
      totalYellowCards: 4,
      homeOffsides: 0,
      awayOffsides: 1,
      totalOffsides: 1
    },
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 8,
    totalShotsOnTarget: 14,
    homeShots: 15,
    awayShots: 20,
    totalShots: 35,
    homeCorners: 7,
    awayCorners: 5,
    totalCorners: 12,
    homeFouls: 13,
    awayFouls: 6,
    totalFouls: 19,
    homeCards: 4,
    awayCards: 1,
    totalCards: 5,
    homeYellowCards: 4,
    awayYellowCards: 1,
    homeOffsides: 0,
    awayOffsides: 1,
    totalOffsides: 1,
    source: "StatsHUB Real Fixture",
    notes: "Monza 6, Sassuolo 8 = 14 chutes no alvo totais (linha +6.5 bateu GREEN)."
  },

  // 1. Manchester City vs Norwich City (5 - 0)
  // Fontes: PlayerStats.Football, Sofascore, Premier League stats
  // City teve 6 chutes no alvo, Norwich teve 0. Total: 6.
  "16950636": {
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 0,
    totalShotsOnTarget: 6,
    homeShots: 16,
    awayShots: 4,
    totalShots: 20,
    homeCorners: 8,
    awayCorners: 1,
    totalCorners: 9,
    totalCards: 2,
    homeFouls: 8,
    awayFouls: 9,
    totalFouls: 17,
    source: "PlayerStats.Football / Sofascore",
    notes: "City 6, Norwich 0 = 6 chutes no alvo. Linha +6.5 não bateu (RED confirmado)."
  },

  // 2. Real Betis vs Getafe (1 - 0)
  // Fontes: LaLiga, Sofascore, ZeroZero
  // Betis 3, Getafe 3 = 6 chutes no alvo. Total: 6.
  "16416336": {
    homeShotsOnTarget: 3,
    awayShotsOnTarget: 3,
    totalShotsOnTarget: 6,
    homeShots: 11,
    awayShots: 8,
    totalShots: 19,
    homeCorners: 5,
    awayCorners: 4,
    totalCorners: 9,
    totalCards: 5,
    homeFouls: 14,
    awayFouls: 16,
    totalFouls: 30,
    source: "LaLiga / Sofascore",
    notes: "Betis 3, Getafe 3 = 6 chutes no alvo. Linha +6.5 não bateu (RED confirmado)."
  },

  // 3. OFI Crete vs TSG Hoffenheim (2 - 0)
  // Fontes: TotalCorner
  // Hoffenheim teve 8 escanteios (e não 5).
  "16945561": {
    homeCorners: 3,
    awayCorners: 8,
    totalCorners: 11,
    source: "TotalCorner",
    notes: "Hoffenheim registrou 8 escanteios na partida."
  },

  // 4. Juventus vs NEC Nijmegen (5 - 0)
  // Fontes: Playmaker Stats
  // Juventus 7 chutes no alvo, NEC 3 chutes no alvo. Total = 10 chutes no alvo.
  "16943956": {
    homeShotsOnTarget: 7,
    awayShotsOnTarget: 3,
    totalShotsOnTarget: 10,
    homeShots: 11,
    awayShots: 7,
    totalShots: 18,
    source: "Playmaker Stats",
    notes: "Juventus 7, NEC 3 = 10 chutes no alvo (Juve teve 11 chutes totais)."
  },

  // 5. Real Sociedad vs Bournemouth (1 - 2)
  // Fontes: 365Scores
  // 3 cartões para a Real Sociedad + 3 cartões para o Bournemouth = 6 cartões amarelos.
  "16944484": {
    homeYellowCards: 3,
    awayYellowCards: 3,
    totalCards: 6,
    source: "365Scores",
    notes: "Sociedad 3, Bournemouth 3 = 6 cartões aplicados."
  },

  // 6. Crystal Palace vs Lech Poznań (4 - 0)
  // Fontes: ZeroZero
  // Crystal Palace registrou 6 chutes no alvo (e Lech 1).
  "16945038": {
    homeShotsOnTarget: 6,
    awayShotsOnTarget: 1,
    totalShotsOnTarget: 7,
    homeShots: 14,
    awayShots: 5,
    totalShots: 19,
    source: "ZeroZero",
    notes: "Crystal Palace registrou 6 chutes no alvo individuais."
  },

  // 7. Beşiktaş vs Olympique de Marseille (4 - 1)
  // Fontes: OFStats
  // Beşiktaş 7 chutes no alvo, Marseille 3 chutes no alvo = 10 chutes no alvo totais.
  "16945539": {
    homeShotsOnTarget: 7,
    awayShotsOnTarget: 3,
    totalShotsOnTarget: 10,
    homeShots: 13,
    awayShots: 8,
    totalShots: 21,
    source: "OFStats",
    notes: "Beşiktaş 7, Marseille 3 = 10 chutes no alvo na partida."
  },

  // 8. Lillestrøm SK vs Torreense (1 - 2)
  // Fontes: Sky Sports
  // Pelo menos 4 amarelos e 1 vermelho = 5 cartões.
  "16945565": {
    totalCards: 5,
    source: "Sky Sports",
    notes: "4 amarelos aplicados mais expulsão registrada."
  },

  // 9. Málaga vs Villarreal (1 - 3)
  // Fontes: StatMuse
  // Málaga 1 chute no alvo, Villarreal 7 chutes no alvo = 8 chutes no alvo totais.
  "16416338": {
    homeShotsOnTarget: 1,
    awayShotsOnTarget: 7,
    totalShotsOnTarget: 8,
    homeShots: 6,
    awayShots: 14,
    totalShots: 20,
    source: "StatMuse",
    notes: "Málaga 1, Villarreal 7 = 8 chutes no alvo totais na partida."
  },

  // 10. Machida Zelvia vs Svay Rieng FC (2 - 0)
  // Fontes: ZeroZero
  // Machida Zelvia registrou 4 chutes no alvo.
  "16864127": {
    homeShotsOnTarget: 4,
    awayShotsOnTarget: 1,
    totalShotsOnTarget: 5,
    source: "ZeroZero",
    notes: "Machida Zelvia teve 4 chutes no alvo individuais."
  },

  // 11. Shanghai Shenhua vs Tampines Rovers (2 - 1)
  // Fontes: FotMob
  // Shanghai Shenhua 11 chutes no alvo + Tampines Rovers 3 chutes no alvo = 14 chutes no alvo na partida.
  "16864092": {
    homeShotsOnTarget: 11,
    awayShotsOnTarget: 3,
    totalShotsOnTarget: 14,
    homeShots: 18,
    awayShots: 7,
    totalShots: 25,
    source: "FotMob",
    notes: "Shanghai Shenhua 11, Tampines Rovers 3 = 14 chutes no alvo na partida."
  },

  // 12. Montevideo City Torque vs Cienciano (3 - 0)
  // Fontes: 365Scores / PlayerStats
  // Montevideo City Torque 7 chutes no alvo + Cienciano 2 chutes no alvo = 9 chutes no alvo.
  "16883041": {
    homeShotsOnTarget: 7,
    awayShotsOnTarget: 2,
    totalShotsOnTarget: 9,
    homeShots: 14,
    awayShots: 6,
    totalShots: 20,
    source: "365Scores / PlayerStats",
    notes: "Torque 7, Cienciano 2 = 9 chutes no alvo totais na partida."
  },

  // 13. CD Real Tomayapo vs Oriente Petrolero (0 - 2)
  // Fontes: Daily Sports (divergência entre provedores: 6 vs 7 chutes no alvo)
  // Registramos 6 chutes no alvo (3x3), com anotação transparente de divergência.
  "16748596": {
    homeShotsOnTarget: 3,
    awayShotsOnTarget: 3,
    totalShotsOnTarget: 6,
    source: "Daily Sports",
    divergent: true,
    notes: "Fontes divergem entre 6 (3+3) e 7 (3+4) chutes no alvo. Linha +6.5 não superada na fonte primária."
  },

  // 14. Bolívar vs GV San José (4 - 2)
  // Fontes: skortahmin
  // 5 cartões amarelos aplicados no jogo.
  "16748600": {
    totalCards: 5,
    source: "skortahmin",
    notes: "5 cartões amarelos aplicados na partida."
  },

  // 15. PS Kalamata vs AE Larisa (1 - 1)
  // Fontes: Playmaker Stats
  // Kalamata 15 faltas + Larissa 25 faltas = 40 faltas totais registradas na súmula.
  "16924696": {
    homeFouls: 15,
    awayFouls: 25,
    totalFouls: 40,
    source: "Playmaker Stats",
    notes: "Kalamata 15, AE Larisa 25 = 40 faltas cometidas no jogo."
  },

  // 16. FK Železničar Pančevo vs FK Crvena zvezda (1 - 2)
  // Fontes: Fudbal Statistika
  // 0 do Zeleznicar + 3 do Estrela Vermelha = 3 impedimentos na partida.
  "17017995": {
    homeOffsides: 0,
    awayOffsides: 3,
    totalOffsides: 3,
    source: "Fudbal Statistika",
    notes: "0 do Železničar, 3 do Crvena zvezda = 3 impedimentos na partida."
  },

  // 17. Adelaide United vs Wofoo Tai Po (3 - 0)
  "16864024": {
    homeCorners: 7,
    awayCorners: 2,
    totalCorners: 9,
    notes: "Adelaide United teve 7 escanteios individuais."
  },

  // 18. US Biskra vs CR Belouizdad (0 - 1)
  "17048229": {
    homeCorners: 2,
    awayCorners: 5,
    totalCorners: 7,
    notes: "CR Belouizdad teve 5 escanteios individuais."
  },

  // 19. ZED FC vs Canal SC (2 - 1)
  "16738964": {
    totalCards: 4,
    notes: "4 cartões amarelos aplicados."
  },

  // 20. Atlético Bucaramanga vs Independiente Medellín (2 - 2)
  "16390776": {
    totalCards: 7,
    notes: "7 cartões aplicados na partida."
  }
};

/**
 * Normaliza nomes de equipes para matching resiliente
 */
export function normalizeTeamKey(home: string, away: string): string {
  const norm = (str: string) => str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${norm(home)}_${norm(away)}`;
}

/**
 * Busca estatísticas oficiais auditadas por ID do evento ou nomes das equipes
 */
export function getOfficialAuditedStats(eventId?: string | number, homeTeam?: string, awayTeam?: string): AuditedMatchStats | undefined {
  if (eventId) {
    const rawId = String(eventId).replace(/^sh-/, "");
    if (OFFICIAL_AUDITED_MATCH_STATS[rawId]) {
      return OFFICIAL_AUDITED_MATCH_STATS[rawId];
    }
  }

  if (homeTeam && awayTeam) {
    const key = normalizeTeamKey(homeTeam, awayTeam);
    // Verificar se existe matching por chave textual
    for (const [id, stats] of Object.entries(OFFICIAL_AUDITED_MATCH_STATS)) {
      if (stats.notes && stats.notes.toLowerCase().includes(homeTeam.toLowerCase())) {
        return stats;
      }
    }
  }

  return undefined;
}

const fs = require('fs');

const extractCode = `
export function extractRealHistory(market: MarketType, teamData: any[], teamId: number): number[] {
  if (!teamData || teamData.length === 0) return [];
  return teamData.map(matchPerf => {
    const stats = matchPerf.statistics || {};
    const evt = matchPerf.event || {};
    const score = evt.score || {};
    const isHome = matchPerf.homeTeam?.id === teamId;
    
    switch (market) {
      case MarketType.Goals: return isHome ? (score.home || 0) : (score.away || 0);
      case MarketType.Corners: return stats.cornerKicks || 0;
      case MarketType.Cards: return stats.cards || 0;
      case MarketType.YellowCards: return stats.yellowCards || 0;
      case MarketType.RedCards: return stats.redCards || 0;
      case MarketType.ExpectedGoals: return stats.expectedGoals || 0;
      case MarketType.ShotsOnTarget: return stats.totalShotsOnGoal || 0;
      case MarketType.ShotsInTheBox: return stats.totalShotsInsideBox || 0;
      case MarketType.TotalShots: return (stats.shotsOnGoal || 0) + (stats.shotsOffGoal || 0) + (stats.blockedScoringAttempt || 0);
      case MarketType.ShotsOutsideTheBox: return stats.totalShotsOutsideBox || 0;
      case MarketType.Clearances: return stats.totalClearance || 0;
      case MarketType.Dispossessed: return stats.dispossessed || 0;
      case MarketType.ErrorsLeadToGoal: return stats.errorsLeadToGoal || 0;
      case MarketType.ErrorsLeadToShot: return stats.errorsLeadToShot || 0;
      case MarketType.Fouls: return stats.fouls || 0;
      case MarketType.GoalkeeperSaves: return stats.goalkeeperSaves || 0;
      case MarketType.InterceptionWon: return stats.interceptionWon || 0;
      case MarketType.Tackles: return stats.totalTackle || 0;
      case MarketType.FreeKicks: return stats.freeKicks || 0;
      case MarketType.GoalKicks: return stats.goalKicks || 0;
      case MarketType.ThrowIns: return stats.throwIns || 0;
      case MarketType.Possession: return stats.ballPossession || 50;
      case MarketType.Offsides: return stats.offsides || 0;
      case MarketType.Passes: return stats.passes || 0;
      case MarketType.TouchesInOppBox: return stats.touchesInOppBox || 0;
      case MarketType.Crosses: return stats.accurateCross || 0;
      case MarketType.BigChanceCreated: return stats.bigChanceCreated || 0;
      case MarketType.BigChanceMissed: return stats.bigChanceMissed || 0;
      case MarketType.BigChanceScored: return stats.bigChanceScored || 0;
      default: return 0;
    }
  });
}
`;

let code = fs.readFileSync('src/data.ts', 'utf8');

// replace buildMatchObject signature
code = code.replace(
`export function buildMatchObject(
  id: string,
  date: string,
  time: string,
  homeTeam: string,
  awayTeam: string,
  league: string,
  rand: () => number,
  forcedStatus?: "GREEN" | "RED" | "EM_ANDAMENTO" | "PENDENTE",
  forcedScore?: string,
  customStatshubUrl?: string
): MatchData {`,
`export function buildMatchObject(
  id: string,
  date: string,
  time: string,
  homeTeam: string,
  awayTeam: string,
  league: string,
  rand: () => number,
  forcedStatus?: "GREEN" | "RED" | "EM_ANDAMENTO" | "PENDENTE",
  forcedScore?: string,
  customStatshubUrl?: string,
  realHomeData?: { id: number; data: any[] },
  realAwayData?: { id: number; data: any[] }
): MatchData {`
);

// replace history generation
code = code.replace(
`    const homeHistory = generateLast10(hMean, market, rand);
    const awayHistory = generateLast10(aMean, market, rand);`,
`    const homeHistory = realHomeData && realHomeData.data.length > 0 ? extractRealHistory(market, realHomeData.data, realHomeData.id) : generateLast10(hMean, market, rand);
    const awayHistory = realAwayData && realAwayData.data.length > 0 ? extractRealHistory(market, realAwayData.data, realAwayData.id) : generateLast10(aMean, market, rand);`
);

// inject extractRealHistory
code = code + '\n' + extractCode;

fs.writeFileSync('src/data.ts', code);
console.log("Patched data.ts");

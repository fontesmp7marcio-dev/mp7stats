const fs = require('fs');

const rosters = {
  "manchester city": [
    { name: "Ederson", shortName: "Ederson", position: "Goleiro Titular", jerseyNumber: 31, isGoalkeeper: true, photoUrl: "https://r2.thesportsdb.com/images/media/player/cutout/mjr8ep1766238077.png" }, // use placeholders or empty if needed, or I'll just use a generic icon
    { name: "Erling Haaland", shortName: "E. Haaland", position: "Centroavante Artilheiro", jerseyNumber: 9 },
    { name: "Kevin De Bruyne", shortName: "K. De Bruyne", position: "Meia Armador", jerseyNumber: 17 },
    { name: "Phil Foden", shortName: "P. Foden", position: "Ponta", jerseyNumber: 47 },
    { name: "Rodri", shortName: "Rodri", position: "Volante", jerseyNumber: 16 }
  ],
  "nottingham forest": [
    { name: "Matz Sels", shortName: "M. Sels", position: "Goleiro Titular", jerseyNumber: 26, isGoalkeeper: true },
    { name: "Morgan Gibbs-White", shortName: "Gibbs-White", position: "Meia Armador", jerseyNumber: 10 },
    { name: "Chris Wood", shortName: "C. Wood", position: "Centroavante", jerseyNumber: 11 },
    { name: "Anthony Elanga", shortName: "A. Elanga", position: "Ponta", jerseyNumber: 21 },
    { name: "Callum Hudson-Odoi", shortName: "Hudson-Odoi", position: "Ponta", jerseyNumber: 14 }
  ],
  "arsenal": [
    { name: "David Raya", shortName: "D. Raya", position: "Goleiro Titular", jerseyNumber: 22, isGoalkeeper: true },
    { name: "Bukayo Saka", shortName: "B. Saka", position: "Ponta-Direita", jerseyNumber: 7 },
    { name: "Kai Havertz", shortName: "K. Havertz", position: "Atacante de Referência", jerseyNumber: 29 },
    { name: "Martin Ødegaard", shortName: "M. Ødegaard", position: "Meia Armador", jerseyNumber: 8 },
    { name: "Declan Rice", shortName: "D. Rice", position: "Volante", jerseyNumber: 41 }
  ],
  "liverpool": [
    { name: "Alisson Becker", shortName: "Alisson", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Mohamed Salah", shortName: "M. Salah", position: "Ponta-Direita", jerseyNumber: 11 },
    { name: "Darwin Núñez", shortName: "D. Núñez", position: "Centroavante", jerseyNumber: 9 },
    { name: "Luis Díaz", shortName: "L. Díaz", position: "Ponta-Esquerda", jerseyNumber: 7 },
    { name: "Virgil van Dijk", shortName: "V. van Dijk", position: "Zagueiro", jerseyNumber: 4 }
  ],
  "chelsea": [
    { name: "Robert Sánchez", shortName: "R. Sánchez", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Cole Palmer", shortName: "C. Palmer", position: "Meia-Atacante", jerseyNumber: 20 },
    { name: "Nicolas Jackson", shortName: "N. Jackson", position: "Centroavante", jerseyNumber: 15 },
    { name: "Raheem Sterling", shortName: "R. Sterling", position: "Ponta", jerseyNumber: 7 },
    { name: "Enzo Fernández", shortName: "E. Fernández", position: "Volante", jerseyNumber: 8 }
  ],
  "manchester united": [
    { name: "André Onana", shortName: "A. Onana", position: "Goleiro Titular", jerseyNumber: 24, isGoalkeeper: true },
    { name: "Bruno Fernandes", shortName: "B. Fernandes", position: "Meia Armador", jerseyNumber: 8 },
    { name: "Marcus Rashford", shortName: "M. Rashford", position: "Ponta-Esquerda", jerseyNumber: 10 },
    { name: "Rasmus Højlund", shortName: "R. Højlund", position: "Centroavante", jerseyNumber: 11 },
    { name: "Alejandro Garnacho", shortName: "A. Garnacho", position: "Ponta-Direita", jerseyNumber: 17 }
  ],
  "tottenham": [
    { name: "Guglielmo Vicario", shortName: "G. Vicario", position: "Goleiro Titular", jerseyNumber: 13, isGoalkeeper: true },
    { name: "Son Heung-min", shortName: "H. Son", position: "Ponta-Esquerda", jerseyNumber: 7 },
    { name: "James Maddison", shortName: "J. Maddison", position: "Meia Armador", jerseyNumber: 10 },
    { name: "Richarlison", shortName: "Richarlison", position: "Centroavante", jerseyNumber: 9 },
    { name: "Dejan Kulusevski", shortName: "D. Kulusevski", position: "Ponta-Direita", jerseyNumber: 21 }
  ],
  "real madrid": [
    { name: "Thibaut Courtois", shortName: "T. Courtois", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Vinícius Júnior", shortName: "Vini Jr.", position: "Ponta-Esquerda", jerseyNumber: 7 },
    { name: "Jude Bellingham", shortName: "J. Bellingham", position: "Meia Armador", jerseyNumber: 5 },
    { name: "Kylian Mbappé", shortName: "K. Mbappé", position: "Atacante", jerseyNumber: 9 },
    { name: "Rodrygo", shortName: "Rodrygo", position: "Ponta-Direita", jerseyNumber: 11 }
  ],
  "barcelona": [
    { name: "Marc-André ter Stegen", shortName: "Ter Stegen", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Lamine Yamal", shortName: "L. Yamal", position: "Ponta-Direita", jerseyNumber: 19 },
    { name: "Robert Lewandowski", shortName: "Lewandowski", position: "Centroavante", jerseyNumber: 9 },
    { name: "Pedri", shortName: "Pedri", position: "Meia", jerseyNumber: 8 },
    { name: "Raphinha", shortName: "Raphinha", position: "Ponta-Esquerda", jerseyNumber: 11 }
  ],
  "bayern de munique": [
    { name: "Manuel Neuer", shortName: "M. Neuer", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Harry Kane", shortName: "H. Kane", position: "Centroavante", jerseyNumber: 9 },
    { name: "Jamal Musiala", shortName: "J. Musiala", position: "Meia-Atacante", jerseyNumber: 42 },
    { name: "Leroy Sané", shortName: "L. Sané", position: "Ponta", jerseyNumber: 10 },
    { name: "Joshua Kimmich", shortName: "J. Kimmich", position: "Volante", jerseyNumber: 6 }
  ],
  "flamengo": [
    { name: "Agustín Rossi", shortName: "A. Rossi", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Pedro", shortName: "Pedro", position: "Centroavante", jerseyNumber: 9 },
    { name: "Giorgian de Arrascaeta", shortName: "Arrascaeta", position: "Meia Armador", jerseyNumber: 14 },
    { name: "Gerson", shortName: "Gerson", position: "Volante", jerseyNumber: 8 },
    { name: "Everton Cebolinha", shortName: "E. Cebolinha", position: "Ponta", jerseyNumber: 11 }
  ],
  "palmeiras": [
    { name: "Weverton", shortName: "Weverton", position: "Goleiro Titular", jerseyNumber: 21, isGoalkeeper: true },
    { name: "Raphael Veiga", shortName: "R. Veiga", position: "Meia Armador", jerseyNumber: 23 },
    { name: "Estêvão", shortName: "Estêvão", position: "Ponta-Direita", jerseyNumber: 41 },
    { name: "José Manuel López", shortName: "Flaco López", position: "Centroavante", jerseyNumber: 42 },
    { name: "Gustavo Gómez", shortName: "G. Gómez", position: "Zagueiro", jerseyNumber: 15 }
  ],
  "são paulo": [
    { name: "Rafael", shortName: "Rafael", position: "Goleiro Titular", jerseyNumber: 23, isGoalkeeper: true },
    { name: "Jonathan Calleri", shortName: "J. Calleri", position: "Centroavante", jerseyNumber: 9 },
    { name: "Lucas Moura", shortName: "L. Moura", position: "Meia-Atacante", jerseyNumber: 7 },
    { name: "Luciano", shortName: "Luciano", position: "Atacante", jerseyNumber: 10 },
    { name: "Wellington Rato", shortName: "W. Rato", position: "Ponta", jerseyNumber: 27 }
  ],
  "botafogo": [
    { name: "John", shortName: "John", position: "Goleiro Titular", jerseyNumber: 1, isGoalkeeper: true },
    { name: "Tiquinho Soares", shortName: "Tiquinho", position: "Centroavante", jerseyNumber: 9 },
    { name: "Luiz Henrique", shortName: "L. Henrique", position: "Ponta-Direita", jerseyNumber: 7 },
    { name: "Jefferson Savarino", shortName: "J. Savarino", position: "Ponta-Esquerda", jerseyNumber: 10 },
    { name: "Marlon Freitas", shortName: "M. Freitas", position: "Volante", jerseyNumber: 17 }
  ]
};

// Also we must update `generateFallbackRosterForTeam` to just use these if the team matches
let dbCode = fs.readFileSync('src/playerTrendsData.ts', 'utf8');
const teamMapStr = Object.entries(rosters).map(([team, players]) => {
  return `    "${team}": [\n` + players.map(p => `      { name: "${p.name}", shortName: "${p.shortName}", position: "${p.position}", jerseyNumber: ${p.jerseyNumber}, isGoalkeeper: ${!!p.isGoalkeeper} }`).join(',\n') + `\n    ]`;
}).join(',\n');

const injectCode = `
const FALLBACK_REAL_ROSTERS: Record<string, {name: string, shortName: string, position: string, jerseyNumber: number, isGoalkeeper: boolean}[]> = {
${teamMapStr}
};
`;

// Insert FALLBACK_REAL_ROSTERS before generateFallbackRosterForTeam
dbCode = dbCode.replace('function generateFallbackRosterForTeam', injectCode + '\nfunction generateFallbackRosterForTeam');

// Modify generateFallbackRosterForTeam
const replaceFunc = `
function generateFallbackRosterForTeam(teamName: string, teamSide: "home" | "away"): RealPlayerProfile[] {
  const norm = normalizeTeam(teamName);
  const color = teamSide === "home" ? "#004d98" : "#d92027";
  const genericOpponents: TeamOpponent[] = [
    { shortName: "ADV", fullName: "Adversário 1", score: "2-1", isHome: true, minutes: 90, subStatus: "90'", color: "#4f2d7f" },
    { shortName: "RIV", fullName: "Rival Local", score: "1-0", isHome: false, minutes: 90, subStatus: "90'", color: "#00874e" },
    { shortName: "LIG", fullName: "Time da Liga", score: "3-1", isHome: true, minutes: 85, subStatus: "↓ 85'", color: "#d92027" },
    { shortName: "EXT", fullName: "Adversário Fora", score: "2-2", isHome: false, minutes: 90, subStatus: "90'", color: "#0055a5" },
    { shortName: "COP", fullName: "Copa Nacional", score: "1-1", isHome: true, minutes: 90, subStatus: "90'", color: "#fbb034" },
    { shortName: "CID", fullName: "Clube da Cidade", score: "2-0", isHome: false, minutes: 80, subStatus: "↓ 80'", color: "#000000" },
    { shortName: "DIS", fullName: "Disputa Direta", score: "3-2", isHome: true, minutes: 90, subStatus: "90'", color: "#c11026" },
    { shortName: "FOR", fullName: "Forasteiro", score: "0-1", isHome: false, minutes: 90, subStatus: "90'", color: "#006837" },
    { shortName: "LID", fullName: "Líder Geral", score: "1-2", isHome: true, minutes: 90, subStatus: "90'", color: "#00386b" },
    { shortName: "CLA", fullName: "Clássico", score: "2-1", isHome: false, minutes: 90, subStatus: "90'", color: "#ee2524" }
  ];

  const realRoster = FALLBACK_REAL_ROSTERS[norm] || FALLBACK_REAL_ROSTERS[teamName.toLowerCase()] || FALLBACK_REAL_ROSTERS[teamName];
  
  if (realRoster) {
    return realRoster.map(p => {
      const topM = p.isGoalkeeper ? ["Defesas de goleiro", "Cartões"] : ["Chutes no gol", "Finalizações", "Gols", "Faltas sofridas"];
      const marketsObj: any = {};
      
      if (p.isGoalkeeper) {
        marketsObj["Defesas de goleiro"] = {
          avg: 3.8, defaultLine: 2.5, odds: 1.48, values10: [4, 3, 5, 2, 6, 4, 3, 5, 4, 3]
        };
        marketsObj["Cartões"] = {
          avg: 0.1, defaultLine: 0.5, odds: 6.00, values10: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0]
        };
      } else {
        marketsObj["Chutes no gol"] = {
          avg: 1.9, defaultLine: 1.5, odds: 1.40, values10: [2, 2, 3, 1, 2, 2, 3, 2, 2, 1]
        };
        marketsObj["Finalizações"] = {
          avg: 3.6, defaultLine: 2.5, odds: 1.30, values10: [4, 3, 5, 3, 4, 3, 4, 3, 4, 3]
        };
        marketsObj["Gols"] = {
          avg: 0.6, defaultLine: 0.5, odds: 2.35, values10: [1, 1, 0, 1, 0, 1, 0, 1, 1, 0]
        };
        marketsObj["Faltas sofridas"] = {
          avg: 2.2, defaultLine: 1.5, odds: 1.48, values10: [2, 3, 2, 2, 3, 1, 3, 2, 2, 2]
        };
        marketsObj["Desarmes"] = {
          avg: 2.1, defaultLine: 1.5, odds: 1.5, values10: [2, 1, 3, 2, 2, 1, 3, 2, 1, 2]
        };
      }

      return {
        id: \`\${norm}-\${p.jerseyNumber}\`,
        name: p.name,
        shortName: p.shortName,
        team: teamName,
        teamSide,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        isGoalkeeper: p.isGoalkeeper,
        avatarColor: color,
        photoUrl: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(p.shortName)}&background=random&color=fff&size=128\`,
        topMarkets: topM,
        markets: marketsObj,
        opponents10: genericOpponents
      };
    });
  }

  // Se não achar o time na lista real, tenta fazer o fallback genérico que já tinha, mas usando nomes mais "realistas"
  // mas o usuário ODEIA o Lucas Alario, então vamos apenas retornar um placeholder com o NOME DO TIME
`;

dbCode = dbCode.replace(/function generateFallbackRosterForTeam[\s\S]*?return \[\s*\/\/ Goleiro Titular Real[\s\S]*?opponents10: genericOpponents\n    }\n  \];\n}/, replaceFunc + `
  return [
    {
      id: \`\${norm}-gk\`, name: "Goleiro (" + teamName + ")", shortName: "Goleiro", team: teamName, teamSide, position: "Goleiro", jerseyNumber: 1, isGoalkeeper: true, avatarColor: color, topMarkets: ["Defesas de goleiro", "Cartões"], markets: { "Defesas de goleiro": { avg: 3.8, defaultLine: 2.5, odds: 1.48, values10: [4, 3, 5, 2, 6, 4, 3, 5, 4, 3] }, "Cartões": { avg: 0.1, defaultLine: 0.5, odds: 6.00, values10: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0] } }, opponents10: genericOpponents
    },
    {
      id: \`\${norm}-fwd\`, name: "Atacante (" + teamName + ")", shortName: "Atacante", team: teamName, teamSide, position: "Atacante", jerseyNumber: 9, isGoalkeeper: false, avatarColor: color, topMarkets: ["Chutes no gol", "Finalizações", "Gols", "Faltas sofridas"], markets: { "Chutes no gol": { avg: 1.9, defaultLine: 1.5, odds: 1.40, values10: [2, 2, 3, 1, 2, 2, 3, 2, 2, 1] }, "Finalizações": { avg: 3.6, defaultLine: 2.5, odds: 1.30, values10: [4, 3, 5, 3, 4, 3, 4, 3, 4, 3] }, "Gols": { avg: 0.6, defaultLine: 0.5, odds: 2.35, values10: [1, 1, 0, 1, 0, 1, 0, 1, 1, 0] }, "Faltas sofridas": { avg: 2.2, defaultLine: 1.5, odds: 1.48, values10: [2, 3, 2, 2, 3, 1, 3, 2, 2, 2] } }, opponents10: genericOpponents
    }
  ];
}
`);

fs.writeFileSync('src/playerTrendsData.ts', dbCode);

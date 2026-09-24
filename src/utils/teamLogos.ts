/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mapping of team names to known StatsHUB team IDs
export const KNOWN_TEAM_IDS: Record<string, number> = {
  // Brasil Série A & B (IDs oficiais auditados do StatsHUB)
  "flamengo": 5981,
  "corinthians": 1957,
  "palmeiras": 1963,
  "são paulo": 1981,
  "sao paulo": 1981,
  "santos": 1968,
  "grêmio": 5926,
  "gremio": 5926,
  "internacional": 1966,
  "cruzeiro": 1954,
  "atlético-mg": 1977,
  "atletico-mg": 1977,
  "fluminense": 1961,
  "botafogo": 1958,
  "vasco da gama": 1974,
  "vasco": 1974,
  "fortaleza": 2020,
  "athletico-pr": 1967,
  "bahia": 1955,
  "cuiabá": 49202,
  "cuiaba": 49202,
  "vitória": 1976,
  "vitoria": 1976,
  "red bull bragantino": 1999,
  "bragantino": 1999,
  "criciúma": 1984,
  "criciuma": 1984,
  "américamg": 1973,
  "américa-mg": 1973,
  "america-mg": 1973,
  "américa mineiro": 1973,
  "america mineiro": 1973,
  "goiás": 1960,
  "goias": 1960,
  "juventude": 1980,
  "atlético-go": 7314,
  "atletico-go": 7314,
  "atlético goianiense": 7314,
  "atletico goianiense": 7314,
  "guarani": 1972,
  "mirassol": 21982,
  "novorizontino": 135514,
  "brusque": 21884,
  "avaí": 7315,
  "avai": 7315,
  "ituano": 2025,
  "vila nova": 2021,
  "vila nova fc": 2021,
  "operário-pr": 39634,
  "operario-pr": 39634,
  "operário": 39634,
  "operario": 39634,
  "sport recife": 1959,
  "sport": 1959,
  "ceará": 2001,
  "ceara": 2001,
  "coritiba": 1982,
  "ponte preta": 1969,
  "paysandu": 1978,
  "chapecoense": 21845,
  "crb": 22032,
  "botafogo-sp": 1979,
  "amazonas": 381716,
  "amazonas fc": 381716,
  "athletic club": 342775,
  "athletic": 342775,
  "náutico": 2011,
  "nautico": 2011,
  "londrina": 2022,
  "são bernardo": 47504,
  "sao bernardo": 47504,

  // Europa & Champions League
  "real madrid": 2829,
  "barcelona": 2817,
  "atlético de madrid": 2836,
  "atletico de madrid": 2836,
  "athletic bilbao": 2825,
  "real sociedad": 2824,
  "villarreal": 2819,
  "real betis": 2816,
  "betis": 2816,
  "sevilla": 2833,
  "girona": 28930,
  "valencia": 2828,
  "getafe": 2859,
  "leganés": 2845,
  "leganes": 2845,
  "espanyol": 2814,
  "celta de vigo": 2821,
  "manchester city": 17,
  "arsenal": 42,
  "liverpool": 44,
  "chelsea": 38,
  "manchester united": 35,
  "tottenham": 33,
  "aston villa": 40,
  "newcastle": 39,
  "west ham": 37,
  "brighton": 30,
  "bournemouth": 60,
  "wolverhampton": 3,
  "crystal palace": 7,
  "brentford": 50,
  "everton": 48,
  "nottingham forest": 14,
  "fulham": 43,
  "bayern de munique": 2672,
  "bayern munich": 2672,
  "borussia dortmund": 2673,
  "bayer leverkusen": 2681,
  "rb leipzig": 36360,
  "stuttgart": 2677,
  "eintracht frankfurt": 2674,
  "werder bremen": 2675,
  "tsg hoffenheim": 2569,
  "hoffenheim": 2569,
  "juventus": 2687,
  "inter de milão": 2697,
  "inter milan": 2697,
  "inter": 2697,
  "ac milan": 2692,
  "milan": 2692,
  "napoli": 2714,
  "roma": 2702,
  "lazio": 2699,
  "atalanta": 2686,
  "fiorentina": 2693,
  "paris saint-germain": 1644,
  "psg": 1644,
  "monaco": 1653,
  "marseille": 1641,
  "olympique de marseille": 1641,
  "lyon": 1649,
  "lille": 1643,
  "brest": 1647,
  "benfica": 3006,
  "porto": 3002,
  "sporting cp": 3001,
  "sporting": 3001,
  "braga": 3009,
  "ajax": 2953,
  "feyenoord": 2959,
  "psv eindhoven": 2952,
  "psv": 2952,
  "celtic": 2351,
  "rangers": 2352,
  "red bull salzburg": 2046,
  "salzburg": 2046,
  "sturm graz": 2049,
  "levski sofia": 3290,
  "beşiktaş": 3052,
  "besiktas": 3052,
  "galatasaray": 3061,
  "fenerbahçe": 3051,
  "fenerbahce": 3051,
  "shakhtar donetsk": 3280,
  "dinamo zagreb": 3277,
  "red star belgrade": 3288,
  "crvena zvezda": 3288,
  "viktoria plzeň": 3317,
  "viktoria plzen": 3317,
  "sparta praga": 3316,
  "ferencváros": 3349,
  "ferencvaros": 3349,
  "royale union saint-gilloise": 2927,
  "union saint-gilloise": 2927,
  "anderlecht": 2915,
  "club brugge": 2918,

  // América do Sul & Libertadores
  "river plate": 3211,
  "boca juniors": 3210,
  "racing club": 3215,
  "san lorenzo": 3216,
  "independiente": 3214,
  "estudiantes": 3208,
  "talleres": 3206,
  "vélez sarsfield": 3218,
  "velez": 3218,
  "rosario central": 3217,
  "newell's old boys": 3212,
  "colo-colo": 3155,
  "colo colo": 3155,
  "universidad de chile": 3156,
  "universidad católica": 3157,
  "peñarol": 3213,
  "penarol": 3213,
  "nacional (uru)": 3212,
  "nacional": 3212,
  "olimpia": 3222,
  "cerro porteño": 3223,
  "libertad": 3225,
  "ldu quito": 4974,
  "ldu": 4974,
  "independiente del valle": 40664,
  "barcelona sc": 4973,
  "emelec": 4975,
  "bolívar": 3163,
  "bolivar": 3163,
  "the strongest": 3164,
  "alianza lima": 3177,
  "universitario": 3178,
  "sporting cristal": 3179,
  "millonarios": 3183,
  "atlético nacional": 3182,
  "junior barranquilla": 3185,

  // Outros
  "al-hilal": 35277,
  "al-nassr": 35278,
  "al-ittihad": 35279,
  "inter miami cf": 337602,
  "inter miami": 337602
};

// Team primary & secondary colors for fallback shields
export const TEAM_COLOR_MAP: Record<string, { primary: string; secondary: string; text: string }> = {
  "flamengo": { primary: "#C3281E", secondary: "#111111", text: "#FFFFFF" },
  "corinthians": { primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" },
  "palmeiras": { primary: "#006437", secondary: "#FFFFFF", text: "#FFFFFF" },
  "são paulo": { primary: "#CC0000", secondary: "#111111", text: "#FFFFFF" },
  "santos": { primary: "#FFFFFF", secondary: "#111111", text: "#111111" },
  "grêmio": { primary: "#0D80BF", secondary: "#111111", text: "#FFFFFF" },
  "internacional": { primary: "#E50000", secondary: "#FFFFFF", text: "#FFFFFF" },
  "cruzeiro": { primary: "#003A94", secondary: "#FFFFFF", text: "#FFFFFF" },
  "atlético-mg": { primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" },
  "fluminense": { primary: "#7F1734", secondary: "#006233", text: "#FFFFFF" },
  "botafogo": { primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" },
  "vasco da gama": { primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" },
  "fortaleza": { primary: "#0047AB", secondary: "#E32636", text: "#FFFFFF" },
  "athletico-pr": { primary: "#C8102E", secondary: "#111111", text: "#FFFFFF" },
  "bahia": { primary: "#004B87", secondary: "#DA291C", text: "#FFFFFF" },
  "real madrid": { primary: "#0C2340", secondary: "#FEBE10", text: "#FFFFFF" },
  "barcelona": { primary: "#004D98", secondary: "#A50044", text: "#FFFFFF" },
  "liverpool": { primary: "#C8102E", secondary: "#00B2A9", text: "#FFFFFF" },
  "arsenal": { primary: "#EF0107", secondary: "#063672", text: "#FFFFFF" },
  "manchester city": { primary: "#6CABDD", secondary: "#1C2C5B", text: "#FFFFFF" },
  "manchester united": { primary: "#DA291C", secondary: "#FBE122", text: "#FFFFFF" },
  "chelsea": { primary: "#034694", secondary: "#EE242C", text: "#FFFFFF" },
  "bayern de munique": { primary: "#DC052D", secondary: "#0066B2", text: "#FFFFFF" },
  "juventus": { primary: "#111111", secondary: "#FFFFFF", text: "#FFFFFF" },
  "inter de milão": { primary: "#001EA0", secondary: "#111111", text: "#FFFFFF" },
  "ac milan": { primary: "#FB090B", secondary: "#111111", text: "#FFFFFF" },
  "paris saint-germain": { primary: "#004170", secondary: "#DA291C", text: "#FFFFFF" }
};

/**
 * Normalizes a team name for fuzzy matching
 */
export function normalizeTeamName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Resolves the official StatsHUB or CDN logo URL for a team
 */
export function resolveTeamLogoUrl(teamName: string, explicitLogoUrl?: string, explicitTeamId?: number): string | null {
  if (explicitLogoUrl && explicitLogoUrl.startsWith("http")) {
    return explicitLogoUrl;
  }

  if (explicitTeamId) {
    return `https://images.statshub.com/team/${explicitTeamId}.png`;
  }

  const normalized = normalizeTeamName(teamName);
  
  // Exact or direct match
  if (KNOWN_TEAM_IDS[normalized]) {
    return `https://images.statshub.com/team/${KNOWN_TEAM_IDS[normalized]}.png`;
  }

  // Partial match search in known teams
  for (const [key, tid] of Object.entries(KNOWN_TEAM_IDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return `https://images.statshub.com/team/${tid}.png`;
    }
  }

  return null;
}

/**
 * Gets the primary and secondary colors for a team
 */
export function resolveTeamColors(teamName: string, explicitColors?: { primary?: string; secondary?: string; text?: string }) {
  if (explicitColors?.primary && explicitColors.primary !== "#000000") {
    return {
      primary: explicitColors.primary,
      secondary: explicitColors.secondary || explicitColors.primary,
      text: explicitColors.text || "#FFFFFF"
    };
  }

  const normalized = normalizeTeamName(teamName);
  for (const [key, colors] of Object.entries(TEAM_COLOR_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return colors;
    }
  }

  // Generate deterministic pleasant color based on team name hash
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const primary = `hsl(${hue}, 65%, 35%)`;
  const secondary = `hsl(${(hue + 40) % 360}, 70%, 45%)`;

  return { primary, secondary, text: "#FFFFFF" };
}

/**
 * Extracts 2-3 letter initials for a team crest
 */
export function getTeamInitials(teamName: string): string {
  if (!teamName) return "FC";
  const words = teamName.trim().split(/\s+/).filter(w => !["de", "do", "da", "dos", "das", "del", "e", "and", "la", "el", "fc", "cf", "sc", "ec"].includes(w.toLowerCase()));
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return teamName.substring(0, Math.min(3, teamName.length)).toUpperCase();
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utilitário central para filtragem exclusiva de jogos MASCULINOS PROFISSIONAIS (SENIOR).
 * Oculta automaticamente qualquer partida de:
 * 1. Futebol Feminino (todas as categorias femininas)
 * 2. Categorias de Base / Juvenil / Sub (Sub-15, Sub-17, Sub-19, Sub-20, Sub-21, Sub-23, U17, U20, U21, Youth League, etc.)
 */

// Padrões de Futebol Feminino
const WOMEN_REGEX = /\b(feminino|feminina|femenino|femenina|fem|women|womens|women's|woman|ladies|frauen|femmes|damas|dame|mulheres|donna|donne|femeni|femenil)\b|\((f|w|fem|feminino|wmn|women)\)|\b(wsl|nwsl|uwcl|liga f)\b/i;

// Padrões de Categoria de Base / Sub / Youth / Juniors / Aspirantes
const YOUTH_SUB_REGEX = /\b(sub[\s-]?\d{1,2}|u[\s-]?\d{1,2}|under[\s-]?\d{1,2}|youth|juniors?|juniores|juvenil|base|academy|academies|reserves?|aspirantes|primavera|nachwuchs|copinha|uefa youth|pl2|premier league 2|liga revelacao)\b|\((sub[\s-]?\d{1,2}|u[\s-]?\d{1,2}|youth|junior|juniores)\)/i;

/**
 * Verifica se um texto (nome de time, liga, categoria ou país) indica time feminino ou categoria de base
 */
export function isWomenOrYouthText(text?: string | null): boolean {
  if (!text || typeof text !== "string") return false;
  const normalized = text.trim();
  if (!normalized) return false;
  
  return WOMEN_REGEX.test(normalized) || YOUTH_SUB_REGEX.test(normalized);
}

/**
 * Filtro principal para determinar se uma partida é estritamente MASCULINA e PROFISSIONAL (SENIOR)
 * Retorna true se for Masculino Profissional, ou false se for Feminino ou Categoria de Base.
 */
export function isMaleSeniorMatch(match: {
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  categoryCountry?: string;
  home?: string;
  away?: string;
  raw?: any;
}): boolean {
  if (!match) return false;

  const home = match.homeTeam || match.home || "";
  const away = match.awayTeam || match.away || "";
  const league = match.league || "";
  const category = match.categoryCountry || "";

  // 1. Checagem nos campos principais
  if (isWomenOrYouthText(home)) return false;
  if (isWomenOrYouthText(away)) return false;
  if (isWomenOrYouthText(league)) return false;
  if (isWomenOrYouthText(category)) return false;

  // 2. Se houver o objeto raw original da API do StatsHUB, inspecionar propriedades profundas
  if (match.raw) {
    const raw = match.raw;
    const tournName = raw.tournaments?.name || raw.unique_tournaments?.name || "";
    const catName = raw.categories?.name || "";
    const rawHome = raw.homeTeam?.name || raw.homeTeam?.shortName || "";
    const rawAway = raw.awayTeam?.name || raw.awayTeam?.shortName || "";
    const gender = raw.gender || raw.tournaments?.gender || raw.unique_tournaments?.gender || "";

    if (gender && (gender.toLowerCase().includes("f") || gender.toLowerCase().includes("w") || gender.toLowerCase().includes("fem"))) {
      return false;
    }

    if (isWomenOrYouthText(tournName)) return false;
    if (isWomenOrYouthText(catName)) return false;
    if (isWomenOrYouthText(rawHome)) return false;
    if (isWomenOrYouthText(rawAway)) return false;
  }

  return true;
}

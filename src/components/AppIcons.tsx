/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  createLucideIcon,
  Swords, 
  BadgePercent, 
  LineChart, 
  Flag, 
  User, 
  ListOrdered, 
  FileText,
  TrendingUp,
  Search,
  Filter,
  ListFilter,
  CheckCircle,
  Flame,
  Award,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronDown,
  ArrowRightLeft,
  X,
  Sparkles,
  SlidersHorizontal,
  Table,
  LayoutList,
  Target,
  Crosshair,
  Activity,
  Check,
  RefreshCw,
  Zap,
  Clock,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Database
} from "lucide-react";

/* =========================================================================
   10 ÍCONES OFICIAIS DO APP BASEADOS NA REFERÊNCIA DO DESIGN
   (Estádio, Badge %, Espadas, Gráfico, Bola de Futebol, Cartões, Bandeira, Jogador, 1-2 Lista, Documento)
   ========================================================================= */

// 1. Estádio com bandeirinhas e arco de entrada (Partidas / Jogos / Mando)
export const StadiumIcon = createLucideIcon("stadium", [
  ["path", { d: "M6 5.5V2l3 1.75L6 5.5", key: "flag1" }],
  ["path", { d: "M18 5.5V2l3 1.75L18 5.5", key: "flag2" }],
  ["ellipse", { cx: "12", cy: "8.5", rx: "8.5", ry: "3.5", key: "rim" }],
  ["path", { d: "M3.5 8.5v6c0 2.2 3.8 4 8.5 4s8.5-1.8 8.5-4v-6", key: "bowl" }],
  ["path", { d: "M10 18.5v-2a2 2 0 0 1 4 0v2", key: "gate" }]
]);

// 2. Badge com Porcentagem (Probabilidade / Assertividade / EV+ / Hit-Rate)
export const PercentBadgeIcon = BadgePercent;

// 3. Espadas Cruzadas (Duelos / H2H / Confronto Direto / Mandante x Visitante)
export const SwordsDuelIcon = Swords;

// 4. Gráfico com Eixos e Tendência (Desempenho / Análise de Mercado / Estatísticas)
export const TrendChartIcon = LineChart;

// 5. Bola de Futebol Oficial (Gols / Finalizações / Chutes no Alvo / Ambas Marcam)
export const SoccerBallIcon = createLucideIcon("soccer-ball", [
  ["circle", { cx: "12", cy: "12", r: "9.5", key: "ball-circle" }],
  ["path", { d: "m12 7.5-3.5 2.5 1.3 4.2h4.4l1.3-4.2z", key: "center-pentagon" }],
  ["path", { d: "m12 7.5V2.5", key: "line-top" }],
  ["path", { d: "M8.5 10 3.8 8.2", key: "line-top-left" }],
  ["path", { d: "M15.5 10 20.2 8.2", key: "line-top-right" }],
  ["path", { d: "m9.8 14.2-3.3 5", key: "line-bottom-left" }],
  ["path", { d: "m14.2 14.2 3.3 5", key: "line-bottom-right" }]
]);

// 6. Cartões de Árbitro Sobrepostos (Cartões / Advertências / Faltas)
export const RefCardsIcon = createLucideIcon("ref-cards", [
  ["rect", { width: "8", height: "13", x: "4.5", y: "7", rx: "1.5", transform: "rotate(-16 8.5 13.5)", key: "card-yellow" }],
  ["rect", { width: "8", height: "13", x: "11.5", y: "4.5", rx: "1.5", transform: "rotate(14 15.5 11)", key: "card-red" }]
]);

// 7. Bandeirinha de Escanteio / Assistente (Escanteios / Cantos / Impedimentos)
export const CornerFlagIcon = Flag;

// 8. Jogador / Atleta / Perfil (Tendências de Jogadores / Artilheiros / Desarmes)
export const PlayerUserIcon = User;

// 9. Lista Ordenada 1-2 (Classificação / Ranking / Top Apostas / 29 Mercados)
export const RankingListIcon = ListOrdered;

// 10. Documento / Relatório / Auditoria (Prova Real / Sumário Tático / Planilha)
export const ReportDocIcon = FileText;

/* =========================================================================
   HELPER PARA ÍCONE DE CADA MERCADO TÁTICO DOS 29 MERCADOS
   ========================================================================= */
export function getMarketIcon(marketName: string, className: string = "h-4 w-4") {
  const name = marketName.toLowerCase();

  if (name.includes("gol") || name.includes("btts") || name.includes("ambas") || name.includes("placar")) {
    return <SoccerBallIcon className={className} />;
  }
  if (name.includes("canto") || name.includes("escanteio") || name.includes("corner") || name.includes("impedimento") || name.includes("offside")) {
    return <CornerFlagIcon className={className} />;
  }
  if (name.includes("cart") || name.includes("card") || name.includes("falta") || name.includes("foul") || name.includes("disciplina")) {
    return <RefCardsIcon className={className} />;
  }
  if (name.includes("chute") || name.includes("finaliz") || name.includes("shot") || name.includes("xg") || name.includes("alvo")) {
    return <Target className={className} />;
  }
  if (name.includes("jogador") || name.includes("player") || name.includes("assist") || name.includes("passe") || name.includes("desarme")) {
    return <PlayerUserIcon className={className} />;
  }
  if (name.includes("duelo") || name.includes("confronto") || name.includes("h2h") || name.includes("resultado") || name.includes("vencedor") || name.includes("handicap") || name.includes("dupla")) {
    return <SwordsDuelIcon className={className} />;
  }
  if (name.includes("ranking") || name.includes("tabela") || name.includes("classifica")) {
    return <RankingListIcon className={className} />;
  }

  // Fallback padrão com Gráfico de Tendência
  return <TrendChartIcon className={className} />;
}

/* =========================================================================
   EXPORTAÇÕES DE ÍCONES DO LUCIDE REUTILIZADOS
   ========================================================================= */
export {
  TrendingUp,
  Search,
  Filter,
  ListFilter,
  CheckCircle,
  Flame,
  Award,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronDown,
  ArrowRightLeft,
  X,
  Sparkles,
  SlidersHorizontal,
  Table,
  LayoutList,
  Target,
  Crosshair,
  Activity,
  Check,
  RefreshCw,
  Zap,
  Clock,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  Database
};

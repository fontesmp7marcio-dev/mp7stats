/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { resolveTeamLogoUrl, resolveTeamColors, getTeamInitials } from "../utils/teamLogos";

export interface TeamEmblemProps {
  name: string;
  logoUrl?: string;
  teamId?: number;
  colors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CONFIGS = {
  xs: {
    container: "w-[18px] h-[18px] min-w-[18px]",
    img: "w-[18px] h-[18px]",
    text: "text-[8px] font-black",
    svgShield: 18
  },
  sm: {
    container: "w-[22px] h-[22px] min-w-[22px]",
    img: "w-[22px] h-[22px]",
    text: "text-[9px] font-black",
    svgShield: 22
  },
  md: {
    container: "w-7 h-7 min-w-7",
    img: "w-7 h-7",
    text: "text-[10px] font-black",
    svgShield: 28
  },
  lg: {
    container: "w-10 h-10 min-w-10",
    img: "w-10 h-10",
    text: "text-xs font-black",
    svgShield: 40
  },
  xl: {
    container: "w-14 h-14 min-w-14",
    img: "w-14 h-14",
    text: "text-sm font-black",
    svgShield: 56
  }
};

export const TeamEmblem: React.FC<TeamEmblemProps> = ({
  name,
  logoUrl,
  teamId,
  colors,
  size = "sm",
  className = ""
}) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveTeamLogoUrl(name, logoUrl, teamId);
  const teamColors = resolveTeamColors(name, colors);
  const initials = getTeamInitials(name);
  const config = SIZE_CONFIGS[size] || SIZE_CONFIGS.sm;

  // Se houver URL válida e a imagem ainda não tiver dado erro
  if (resolvedUrl && !imgError) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center shrink-0 ${config.container} ${className}`}
        title={name}
      >
        <img
          src={resolvedUrl}
          alt={`Escudo do ${name}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`${config.img} object-contain transition-opacity duration-200 drop-shadow-2xs`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: Escudo Heráldico Vetorial elegante com as cores e iniciais do clube
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-md border border-black/10 shadow-2xs ${config.container} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${teamColors.primary} 0%, ${teamColors.secondary} 100%)`,
        color: teamColors.text || "#FFFFFF"
      }}
      title={name}
    >
      {/* Detalhe sutil de brilho superior do escudo */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      
      {/* Iniciais estilizadas do clube */}
      <span className={`${config.text} tracking-tighter drop-shadow-xs relative z-10 uppercase`}>
        {initials}
      </span>
    </div>
  );
};

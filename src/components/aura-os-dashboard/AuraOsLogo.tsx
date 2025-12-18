/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  AURA OS - SVG Logo Component (Web Version)                                ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import React from 'react';

interface AuraOsLogoProps {
  size?: number;
  className?: string;
}

export const AuraOsLogo: React.FC<AuraOsLogoProps> = ({ 
  size = 40, 
  className = '' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#020617"/>
          <stop offset="45%" stopColor="#020617"/>
          <stop offset="100%" stopColor="#00010a"/>
        </radialGradient>

        <linearGradient id="auraCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc"/>
          <stop offset="50%" stopColor="#22d3ee"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>

        <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.13
                    0 0 0 0 0.85
                    0 0 0 0 0.96
                    0 0 0 0.9 0" />
        </filter>

        <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feComposite in="blur" in2="SourceGraphic" operator="atop"/>
        </filter>
      </defs>

      <rect x="32" y="32" width="448" height="448" rx="128" fill="url(#bg)"/>
      <circle cx="256" cy="256" r="150" fill="#22d3ee" opacity="0.25" filter="url(#softGlow)"/>

      <g transform="translate(256 256)" fill="none" stroke="url(#auraCyan)" strokeWidth="10" filter="url(#innerGlow)">
        <ellipse rx="122" ry="72" transform="rotate(-18)" />
        <ellipse rx="72" ry="122" transform="rotate(32)" opacity="0.7"/>
        <circle cx="0" cy="0" r="36" fill="none" stroke="url(#auraCyan)" strokeWidth="8"/>
        <circle cx="0" cy="0" r="16" fill="#a5f3fc"/>
        <circle cx="86" cy="-18" r="10" fill="#a5f3fc"/>
      </g>

      <rect x="32.5" y="32.5" width="447" height="447" rx="128"
            fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="2"/>
    </svg>
  );
};

export default AuraOsLogo;


import React from 'react';

// ============================================================================
// 1. RED TEAM: MAJESTIC CROWNED LION
// Matches user screenshot: White/Silver Lion with Glowing Ruby Red Crown
// ============================================================================
export const CrownedLionIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Background Glow */}
      <radialGradient id="lion_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
        <stop offset="60%" stopColor="#991b1b" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#450a0a" stopOpacity="0" />
      </radialGradient>
      {/* Ruby Crown Gradient */}
      <linearGradient id="crown_gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="crown_ruby" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="50%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
      {/* Silver/White Lion Mane & Fur */}
      <linearGradient id="fur_silver" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#94a3b8" />
      </linearGradient>
      <linearGradient id="fur_shadow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#1e293b" />
      </linearGradient>
      <radialGradient id="eye_ruby" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="60%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </radialGradient>
    </defs>

    {/* Ambient Red Aura */}
    <circle cx="80" cy="80" r="76" fill="url(#lion_glow)" />

    {/* Outer Mane Tufts (Fierce Silver/White) */}
    <g filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.6))">
      {/* Left Mane */}
      <path d="M 45 60 C 30 75, 20 95, 25 120 C 32 110, 38 105, 42 112 C 35 125, 40 138, 52 142 C 55 130, 60 125, 66 130 C 58 142, 70 148, 80 148 C 90 148, 102 142, 94 130 C 100 125, 105 130, 108 142 C 120 138, 125 125, 118 112 C 122 105, 128 110, 135 120 C 140 95, 130 75, 115 60 Z" fill="url(#fur_shadow)" />
      <path d="M 50 68 C 38 80, 32 98, 38 116 C 45 106, 50 106, 52 114 C 48 126, 55 134, 64 134 C 66 124, 72 120, 78 125 C 72 134, 80 138, 80 138 C 80 138, 88 134, 82 125 C 88 120, 94 124, 96 134 C 105 134, 112 126, 108 114 C 110 106, 115 106, 122 116 C 128 98, 122 80, 110 68 Z" fill="url(#fur_silver)" />

      {/* Mane Spikes Layer */}
      <path d="M 36 82 L 48 86 L 38 96 L 50 98 L 44 110 L 56 108 L 52 122 L 66 116 L 68 128 L 80 122 L 92 128 L 94 116 L 108 122 L 104 108 L 116 110 L 110 98 L 122 96 L 112 86 L 124 82 L 110 74" stroke="#e2e8f0" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </g>

    {/* Lion Face Structure */}
    <g>
      {/* Cheeks & Jaw */}
      <path d="M 54 82 C 50 96, 58 114, 80 114 C 102 114, 110 96, 106 82 C 104 70, 95 64, 80 64 C 65 64, 56 70, 54 82 Z" fill="#f8fafc" />
      {/* Brow & Forehead Shadow */}
      <path d="M 60 72 C 68 76, 75 76, 80 78 C 85 76, 92 76, 100 72 C 94 65, 87 62, 80 62 C 73 62, 66 65, 60 72 Z" fill="#cbd5e1" />
      {/* Snout & Whisker Pads */}
      <path d="M 68 88 C 65 96, 72 104, 80 104 C 88 104, 95 96, 92 88 C 88 84, 72 84, 68 88 Z" fill="#e2e8f0" />
      {/* Fierce Open Mouth & Fangs */}
      <path d="M 72 96 C 70 106, 74 110, 80 110 C 86 110, 90 106, 88 96 Z" fill="#450a0a" />
      {/* Tongue */}
      <ellipse cx="80" cy="106" rx="4.5" ry="3" fill="#ef4444" />
      {/* Upper Fangs */}
      <polygon points="74,96 76,101 77,96" fill="#ffffff" />
      <polygon points="86,96 84,101 83,96" fill="#ffffff" />
      {/* Lower Fangs */}
      <polygon points="75,109 76,105 77,109" fill="#ffffff" />
      <polygon points="85,109 84,105 83,109" fill="#ffffff" />

      {/* Nose */}
      <polygon points="76,86 84,86 80,91" fill="#1e293b" />

      {/* Fierce Ruby Eyes */}
      {/* Left Eye */}
      <polygon points="62,76 71,78 68,81 60,78" fill="#1e293b" />
      <polygon points="63,77 69,78 67,80 62,78" fill="url(#eye_ruby)" />
      <circle cx="66" cy="78.5" r="1" fill="#ffffff" />

      {/* Right Eye */}
      <polygon points="98,76 89,78 92,81 100,78" fill="#1e293b" />
      <polygon points="97,77 91,78 93,80 98,78" fill="url(#eye_ruby)" />
      <circle cx="94" cy="78.5" r="1" fill="#ffffff" />
    </g>

    {/* Royal Ruby & Gold Crown */}
    <g filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.75))">
      {/* Crown Base Rim */}
      <path d="M 52 56 Q 80 62 108 56 L 105 50 Q 80 55 55 50 Z" fill="url(#crown_gold)" stroke="#78350f" strokeWidth="1" />
      {/* Crown Rim Gems */}
      <circle cx="62" cy="54" r="2" fill="url(#crown_ruby)" stroke="#ffffff" strokeWidth="0.5" />
      <circle cx="80" cy="56" r="2.5" fill="url(#crown_ruby)" stroke="#ffffff" strokeWidth="0.5" />
      <circle cx="98" cy="54" r="2" fill="url(#crown_ruby)" stroke="#ffffff" strokeWidth="0.5" />

      {/* 5 Crown Spires */}
      <path d="M 54 50 L 50 32 L 62 44 L 80 20 L 98 44 L 110 32 L 106 50 Q 80 56 54 50 Z" fill="url(#crown_ruby)" stroke="url(#crown_gold)" strokeWidth="1.8" />

      {/* Crown Spire Gems & Pearls */}
      <circle cx="50" cy="31" r="3" fill="url(#crown_gold)" />
      <circle cx="50" cy="31" r="1.5" fill="#ffffff" />
      <circle cx="110" cy="31" r="3" fill="url(#crown_gold)" />
      <circle cx="110" cy="31" r="1.5" fill="#ffffff" />
      {/* Center Grand Ruby Jewel */}
      <circle cx="80" cy="19" r="4.5" fill="url(#crown_gold)" />
      <circle cx="80" cy="19" r="3" fill="url(#crown_ruby)" />
      <circle cx="79" cy="18" r="1" fill="#ffffff" />

      {/* Ornate Fleur Cross on Crown Peak */}
      <polygon points="80,11 82,14 80,16 78,14" fill="#fef08a" />
      <polygon points="76,14 84,14 80,15" fill="#fef08a" />
    </g>
  </svg>
);

// ============================================================================
// 2. BLUE TEAM: IMPERIAL CELESTIAL EAGLE
// ============================================================================
export const ImperialEagleIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="eagle_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#0369a1" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sapphire_grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
      <linearGradient id="silver_wing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="76" fill="url(#eagle_glow)" />

    {/* Sweeping Wings */}
    <path d="M 80 70 C 50 30, 20 45, 18 85 C 30 80, 42 85, 48 95 C 40 85, 55 75, 80 90 C 105 75, 120 85, 112 95 C 118 85, 130 80, 142 85 C 140 45, 110 30, 80 70 Z" fill="url(#silver_wing)" />
    
    {/* Eagle Head & Beak */}
    <path d="M 72 45 C 72 35, 88 35, 88 45 C 88 55, 96 60, 98 68 C 94 72, 85 70, 80 76 C 75 70, 66 72, 62 68 C 64 60, 72 55, 72 45 Z" fill="#ffffff" />
    <path d="M 80 62 L 86 65 L 80 75 L 74 65 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
    <circle cx="75" cy="52" r="2" fill="#0284c7" />
    <circle cx="85" cy="52" r="2" fill="#0284c7" />

    {/* Imperial Shield Body */}
    <path d="M 64 80 L 96 80 L 92 115 L 80 130 L 68 115 Z" fill="url(#sapphire_grad)" stroke="#fef08a" strokeWidth="2.5" />
    <path d="M 80 86 L 80 122 M 70 96 L 90 96" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// 3. NEUTRAL TEAM: SCALES OF HARMONY & LAUREL
// ============================================================================
export const NeutralScalesIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="neutral_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
        <stop offset="70%" stopColor="#78350f" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="gold_metallic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="45%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#854d0e" />
      </linearGradient>
    </defs>
    <circle cx="80" cy="80" r="76" fill="url(#neutral_glow)" />

    {/* Laurel Wreath Ring */}
    <circle cx="80" cy="80" r="54" stroke="#eab308" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />

    {/* Pillar of Balance */}
    <path d="M 76 38 L 84 38 L 82 124 L 78 124 Z" fill="url(#gold_metallic)" />
    <ellipse cx="80" cy="34" rx="7" ry="4" fill="url(#gold_metallic)" />
    <ellipse cx="80" cy="125" rx="18" ry="6" fill="url(#gold_metallic)" />

    {/* Balance Beam */}
    <path d="M 40 48 C 60 46, 100 46, 120 48" stroke="url(#gold_metallic)" strokeWidth="3.5" strokeLinecap="round" />

    {/* Left Pan */}
    <line x1="42" y1="48" x2="32" y2="76" stroke="#e2e8f0" strokeWidth="1.2" />
    <line x1="42" y1="48" x2="52" y2="76" stroke="#e2e8f0" strokeWidth="1.2" />
    <path d="M 28 76 Q 42 90 56 76 Z" fill="url(#gold_metallic)" stroke="#78350f" strokeWidth="1" />

    {/* Right Pan */}
    <line x1="118" y1="48" x2="108" y2="76" stroke="#e2e8f0" strokeWidth="1.2" />
    <line x1="118" y1="48" x2="128" y2="76" stroke="#e2e8f0" strokeWidth="1.2" />
    <path d="M 104 76 Q 118 90 132 76 Z" fill="url(#gold_metallic)" stroke="#78350f" strokeWidth="1" />
  </svg>
);

// ============================================================================
// 4. ROLE #6: FULL VOTE CARD SWAPPER (MYSTICAL SWAPPING HANDS)
// Matches user screenshot: Two mystic hands exchanging glowing cosmic cards
// ============================================================================
export const CardSwapperIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Cosmic Nebula Aura */}
      <radialGradient id="nebula_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.45" />
        <stop offset="50%" stopColor="#7e22ce" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
      </radialGradient>
      {/* Mystic Hand Sleeves & Skin */}
      <linearGradient id="mystic_sleeve" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#581c87" />
        <stop offset="100%" stopColor="#1e1b4b" />
      </linearGradient>
      <linearGradient id="mystic_skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="60%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      {/* Glowing Gold / Orange Card A */}
      <linearGradient id="card_amber" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#7c2d12" />
      </linearGradient>
      {/* Glowing Violet / Purple Card B */}
      <linearGradient id="card_cosmic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e879f9" />
        <stop offset="50%" stopColor="#9333ea" />
        <stop offset="100%" stopColor="#3b0764" />
      </linearGradient>
    </defs>

    {/* Nebula Backdrop & Stardust */}
    <rect width="280" height="140" rx="16" fill="transparent" />
    <ellipse cx="140" cy="70" rx="110" ry="60" fill="url(#nebula_glow)" />

    {/* Swirling Stardust Particles */}
    <circle cx="110" cy="45" r="1.5" fill="#fbcfe8" opacity="0.8" />
    <circle cx="165" cy="35" r="2" fill="#e9d5ff" opacity="0.9" />
    <circle cx="140" cy="25" r="1.2" fill="#ffffff" opacity="0.7" />
    <circle cx="180" cy="85" r="1.5" fill="#fef08a" opacity="0.8" />
    <circle cx="95" cy="95" r="1.8" fill="#f43f5e" opacity="0.7" />
    <circle cx="130" cy="115" r="1.5" fill="#a855f7" opacity="0.9" />

    {/* Energy Exchange Swirl Streams */}
    <path d="M 105 80 C 120 40, 155 40, 175 60" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" opacity="0.85" />
    <path d="M 175 65 C 160 100, 125 100, 105 75" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" opacity="0.85" />

    {/* Left Mystic Hand (giving/holding Card A) */}
    <g filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.7))">
      {/* Sleeve */}
      <path d="M 0 110 L 55 92 L 65 110 L 0 140 Z" fill="url(#mystic_sleeve)" />
      <path d="M 52 90 L 68 108" stroke="#c084fc" strokeWidth="2.5" />
      {/* Palm & Fingers */}
      <path d="M 55 92 C 70 85, 88 80, 102 74 C 105 73, 108 77, 104 80 C 95 86, 85 92, 75 97 C 88 93, 100 90, 108 89 C 112 89, 112 94, 106 96 C 96 100, 85 104, 75 107 C 85 106, 96 105, 102 105 C 105 106, 104 110, 98 112 C 86 115, 70 116, 62 110 Z" fill="url(#mystic_skin)" />
    </g>

    {/* Right Mystic Hand (receiving/holding Card B) */}
    <g filter="drop-shadow(0px 4px 10px rgba(0,0,0,0.7))">
      {/* Sleeve */}
      <path d="M 280 110 L 225 92 L 215 110 L 280 140 Z" fill="url(#mystic_sleeve)" />
      <path d="M 228 90 L 212 108" stroke="#38bdf8" strokeWidth="2.5" />
      {/* Palm & Fingers */}
      <path d="M 225 92 C 210 85, 192 80, 178 74 C 175 73, 172 77, 176 80 C 185 86, 195 92, 205 97 C 192 93, 180 90, 172 89 C 168 89, 168 94, 174 96 C 184 100, 195 104, 205 107 C 195 106, 184 105, 178 105 C 175 106, 176 110, 182 112 C 194 115, 210 116, 218 110 Z" fill="url(#mystic_skin)" />
    </g>

    {/* Card A: Amber Tarot Card floating left */}
    <g transform="rotate(-15 115 55)" filter="drop-shadow(0px 0px 14px rgba(251,191,36,0.9))">
      <rect x="95" y="28" width="40" height="58" rx="5" fill="url(#card_amber)" stroke="#fef08a" strokeWidth="1.8" />
      <rect x="99" y="32" width="32" height="50" rx="3" fill="#1c1917" opacity="0.4" stroke="#fde047" strokeWidth="0.8" />
      <circle cx="115" cy="57" r="8" fill="#ea580c" stroke="#fef08a" strokeWidth="1" />
      <polygon points="115,51 118,57 115,63 112,57" fill="#ffffff" />
    </g>

    {/* Card B: Cosmic Violet Tarot Card floating right */}
    <g transform="rotate(18 165 52)" filter="drop-shadow(0px 0px 14px rgba(168,85,247,0.9))">
      <rect x="145" y="25" width="40" height="58" rx="5" fill="url(#card_cosmic)" stroke="#f5d0fe" strokeWidth="1.8" />
      <rect x="149" y="29" width="32" height="50" rx="3" fill="#180d2b" opacity="0.4" stroke="#e879f9" strokeWidth="0.8" />
      <circle cx="165" cy="54" r="8" fill="#7e22ce" stroke="#f5d0fe" strokeWidth="1" />
      <circle cx="165" cy="54" r="4" fill="#38bdf8" />
      <ellipse cx="165" cy="54" rx="10" ry="3" fill="none" stroke="#e879f9" strokeWidth="1" transform="rotate(-30 165 54)" />
    </g>
  </svg>
);

// ============================================================================
// 5. 3 ROUND VOTE CARDS FAN LAYOUT
// Matches user screenshot: 3 Cards (e.g. Blue, Blue, Neutral) with Winged Shields
// ============================================================================
export const VoteCardsFanIllustration: React.FC<{
  cards?: Array<{ id: string; faction: string }>;
  className?: string;
}> = ({ cards = [{ id: '1', faction: 'BLUE' }, { id: '2', faction: 'BLUE' }, { id: '3', faction: 'NEUTRAL' }], className = 'w-full h-32' }) => {
  const c1 = cards[0]?.faction || 'BLUE';
  const c2 = cards[1]?.faction || 'BLUE';
  const c3 = cards[2]?.faction || 'NEUTRAL';

  const FACTION_PALETTE: Record<string, { bg: string; border: string; glow: string; text: string; label: string }> = {
    RED: {
      bg: '#7f1d1d',
      border: '#f87171',
      glow: 'rgba(239,68,68,0.7)',
      text: '#fecaca',
      label: 'RED',
    },
    BLUE: {
      bg: '#0c4a6e',
      border: '#38bdf8',
      glow: 'rgba(14,165,233,0.7)',
      text: '#bae6fd',
      label: 'BLUE',
    },
    NEUTRAL: {
      bg: '#475569',
      border: '#cbd5e1',
      glow: 'rgba(203,213,225,0.6)',
      text: '#f8fafc',
      label: 'NEUTRAL',
    },
  };

  const f1 = FACTION_PALETTE[c1] || FACTION_PALETTE.BLUE;
  const f2 = FACTION_PALETTE[c2] || FACTION_PALETTE.BLUE;
  const f3 = FACTION_PALETTE[c3] || FACTION_PALETTE.NEUTRAL;

  return (
    <svg viewBox="0 0 260 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Card 1 Shadow */}
        <filter id="card_shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.8" />
        </filter>
        <filter id="center_glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#38bdf8" floodOpacity="0.85" />
        </filter>
      </defs>

      {/* Background Soft Glow */}
      <ellipse cx="130" cy="70" rx="90" ry="50" fill="#0284c7" opacity="0.15" />

      {/* CARD 1 (Left tilted -14°) */}
      <g transform="rotate(-14 90 95)" filter="url(#card_shadow)">
        <rect x="60" y="24" width="55" height="85" rx="7" fill={f1.bg} stroke={f1.border} strokeWidth="1.8" />
        <rect x="63" y="27" width="49" height="79" rx="5" fill="#031b2f" opacity="0.6" stroke={f1.border} strokeWidth="0.8" />
        {/* Label Tag */}
        <rect x="70" y="32" width="35" height="11" rx="3" fill="#0f172a" stroke={f1.border} strokeWidth="0.8" />
        <text x="87.5" y="40" fill={f1.text} fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
          {f1.label}
        </text>
        {/* Winged Sword Emblem */}
        <path d="M 87.5 50 L 87.5 76 M 80 57 L 95 57" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 87.5 76 L 85 79 L 90 79 Z" fill="#e2e8f0" />
        <path d="M 76 60 Q 87.5 54 87.5 68 Q 87.5 54 99 60" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
      </g>

      {/* CARD 3 (Right tilted +14°) */}
      <g transform="rotate(14 170 95)" filter="url(#card_shadow)">
        <rect x="145" y="24" width="55" height="85" rx="7" fill={f3.bg} stroke={f3.border} strokeWidth="1.8" />
        <rect x="148" y="27" width="49" height="79" rx="5" fill="#0f172a" opacity="0.6" stroke={f3.border} strokeWidth="0.8" />
        {/* Label Tag */}
        <rect x="151" y="32" width="43" height="11" rx="3" fill="#0f172a" stroke={f3.border} strokeWidth="0.8" />
        <text x="172.5" y="40" fill={f3.text} fontSize="7" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
          {f3.label}
        </text>
        {/* Winged Sword Emblem */}
        <path d="M 172.5 50 L 172.5 76 M 165 57 L 180 57" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 172.5 76 L 170 79 L 175 79 Z" fill="#e2e8f0" />
        <path d="M 161 60 Q 172.5 54 172.5 68 Q 172.5 54 184 60" stroke="#f59e0b" strokeWidth="1.2" fill="none" />
      </g>

      {/* CARD 2 (Center Upright & Elevated with Glow) */}
      <g filter="url(#center_glow)">
        <rect x="102" y="16" width="56" height="88" rx="8" fill={f2.bg} stroke={f2.border} strokeWidth="2.2" />
        <rect x="106" y="20" width="48" height="80" rx="6" fill="#082f49" opacity="0.75" stroke="#fef08a" strokeWidth="1" />
        {/* Gold Border Filigree Inner Inset */}
        <rect x="109" y="23" width="42" height="74" rx="4" fill="none" stroke="#fef08a" strokeWidth="0.7" strokeDasharray="4 2" />
        {/* Label Banner */}
        <rect x="112" y="27" width="36" height="13" rx="4" fill="#0f172a" stroke="#fef08a" strokeWidth="1" />
        <text x="130" y="36.5" fill="#fef08a" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
          {f2.label}
        </text>
        {/* Grand Golden Winged Crest */}
        <path d="M 130 46 L 130 76 M 121 54 L 139 54" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="130" cy="78" r="2.5" fill="#f59e0b" />
        {/* Wings */}
        <path d="M 117 58 C 124 50, 130 52, 130 64 C 130 52, 136 50, 143 58 C 146 66, 138 72, 130 74 C 122 72, 114 66, 117 58 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
      </g>
    </svg>
  );
};

// ============================================================================
// 6. WINGED WHITE ROSE (ACTIVE MAIN CARD ARTWORK)
// Matches user screenshot: Celestial White Rose with Feathered Golden Wings
// ============================================================================
export const WingedRoseIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-24 sm:w-28 sm:h-28' }) => (
  <svg viewBox="0 0 180 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Radiant Golden Halo */}
      <radialGradient id="rose_halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
      </radialGradient>
      {/* Celestial Feather Gradient */}
      <linearGradient id="wing_feathers" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      {/* Rose Petal Gradient */}
      <linearGradient id="rose_petal" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </defs>

    {/* Radiant Celestial Halo */}
    <ellipse cx="90" cy="70" rx="80" ry="60" fill="url(#rose_halo)" />

    {/* LEFT CELESTIAL WING (Spreading upward) */}
    <g filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.65))">
      {/* Upper Primary Feathers */}
      <path d="M 80 75 C 65 50, 40 30, 10 32 C 15 45, 25 55, 38 65 C 22 55, 30 75, 46 80 C 35 75, 42 90, 56 90 C 65 90, 75 85, 80 75 Z" fill="url(#wing_feathers)" stroke="#94a3b8" strokeWidth="1" />
      {/* Detailed Feather Ribs */}
      <path d="M 20 38 C 45 48, 65 62, 78 72 M 35 60 C 50 68, 65 74, 75 78 M 48 76 C 60 82, 70 84, 76 84" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
    </g>

    {/* RIGHT CELESTIAL WING (Spreading upward) */}
    <g filter="drop-shadow(0px 4px 8px rgba(0,0,0,0.65))">
      {/* Upper Primary Feathers */}
      <path d="M 100 75 C 115 50, 140 30, 170 32 C 165 45, 155 55, 142 65 C 158 55, 150 75, 134 80 C 145 75, 138 90, 124 90 C 115 90, 105 85, 100 75 Z" fill="url(#wing_feathers)" stroke="#94a3b8" strokeWidth="1" />
      {/* Detailed Feather Ribs */}
      <path d="M 160 38 C 135 48, 115 62, 102 72 M 145 60 C 130 68, 115 74, 105 78 M 132 76 C 120 82, 110 84, 104 84" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />
    </g>

    {/* CENTER BLOOMING WHITE ROSE */}
    <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.7))">
      {/* Outer Petals */}
      <path d="M 70 75 C 65 88, 75 105, 90 106 C 105 105, 115 88, 110 75 C 115 62, 105 52, 90 52 C 75 52, 65 62, 70 75 Z" fill="url(#rose_petal)" stroke="#cbd5e1" strokeWidth="1.2" />
      {/* Middle Petal Folds */}
      <path d="M 74 72 C 78 84, 88 92, 96 86 C 102 82, 104 74, 98 66 C 90 60, 80 64, 74 72 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.9" />
      {/* Center Spiral Core */}
      <path d="M 85 70 C 85 64, 93 64, 94 69 C 95 74, 87 78, 86 74 C 85 72, 88 71, 90 72" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      
      {/* Green Stem & Calyx Leaves */}
      <path d="M 85 106 C 87 118, 92 128, 90 134" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
      <path d="M 86 112 C 76 110, 72 104, 70 98 C 76 100, 84 104, 86 112 Z" fill="#16a34a" />
      <path d="M 88 116 C 98 114, 104 108, 106 102 C 100 104, 92 108, 88 116 Z" fill="#16a34a" />
    </g>
  </svg>
);

// ============================================================================
// 7. ORNATE GOLD FILIGREE CORNER BRACKETS WITH SAPPHIRE GEMS
// Matches the bottom action box in the user's screenshot
// ============================================================================
export const CornerFiligree: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}> = ({ position, className = 'w-7 h-7 sm:w-9 sm:h-9' }) => {
  const transform =
    position === 'top-right'
      ? 'scale(-1, 1)'
      : position === 'bottom-left'
      ? 'scale(1, -1)'
      : position === 'bottom-right'
      ? 'scale(-1, -1)'
      : 'none';

  return (
    <svg viewBox="0 0 36 36" className={className} style={{ transform }} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="filigree_gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <radialGradient id="sapphire_gem" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#082f49" />
        </radialGradient>
      </defs>

      {/* Main Curved Corner Bracket Frame */}
      <path
        d="M 2 34 L 2 10 C 2 5, 5 2, 10 2 L 34 2 C 28 4, 18 6, 12 12 C 6 18, 4 28, 2 34 Z"
        fill="url(#filigree_gold)"
        stroke="#78350f"
        strokeWidth="1"
      />
      {/* Inner Decorative Curl */}
      <path
        d="M 6 24 C 6 14, 14 6, 24 6"
        stroke="#fef08a"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Corner Center Stud / Sapphire Gem */}
      <circle cx="9" cy="9" r="4.5" fill="url(#sapphire_gem)" stroke="url(#filigree_gold)" strokeWidth="1.5" />
      <circle cx="8" cy="8" r="1.2" fill="#ffffff" />
    </svg>
  );
};

// ============================================================================
// 8. ROLE ABILITY ILLUSTRATIONS FOR ROLES 1 TO 5
// ============================================================================
export const RoleSwapperIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="140" cy="70" rx="90" ry="50" fill="#7e22ce" opacity="0.3" />
    {/* Swapping Energy Orbs */}
    <g transform="rotate(-15 110 70)">
      <rect x="85" y="35" width="48" height="70" rx="6" fill="#4c1d95" stroke="#c084fc" strokeWidth="2" />
      <circle cx="109" cy="70" r="12" fill="#7e22ce" />
      <path d="M 103 70 L 115 70 M 109 64 L 109 76" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </g>
    <g transform="rotate(15 170 70)">
      <rect x="145" y="35" width="48" height="70" rx="6" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="169" cy="70" r="12" fill="#0284c7" />
      <polygon points="169,63 175,74 163,74" fill="#ffffff" />
    </g>
    {/* Swirl arrows */}
    <path d="M 115 32 C 140 20, 160 25, 175 35" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="178,35 173,30 170,36" fill="#f472b6" />
    <path d="M 165 108 C 140 120, 120 115, 105 105" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
    <polygon points="102,105 107,110 110,104" fill="#38bdf8" />
  </svg>
);

export const RoleRollerIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="140" cy="70" rx="90" ry="50" fill="#059669" opacity="0.25" />
    {/* Golden Celestial Die with Vote Crest */}
    <g transform="rotate(-10 140 70)" filter="drop-shadow(0px 8px 16px rgba(0,0,0,0.7))">
      <rect x="105" y="35" width="70" height="70" rx="14" fill="#064e3b" stroke="#34d399" strokeWidth="2.5" />
      <rect x="110" y="40" width="60" height="60" rx="10" fill="#022c22" stroke="#6ee7b7" strokeWidth="1" strokeDasharray="4 2" />
      <circle cx="140" cy="70" r="16" fill="#059669" stroke="#a7f3d0" strokeWidth="1.5" />
      <path d="M 132 70 L 138 76 L 149 63" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <circle cx="85" cy="50" r="4" fill="#fef08a" opacity="0.8" />
    <circle cx="195" cy="90" r="4" fill="#fef08a" opacity="0.8" />
  </svg>
);

export const VoteMultiplierIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="140" cy="70" rx="90" ry="50" fill="#ea580c" opacity="0.3" />
    {/* Golden Multiplying Vote Crystals */}
    <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.65))">
      {/* Center Crystal */}
      <polygon points="140,25 156,65 140,115 124,65" fill="#f97316" stroke="#fef08a" strokeWidth="2" />
      <polygon points="140,25 156,65 140,115" fill="#ea580c" />
      {/* Left Crystal */}
      <polygon points="105,45 118,75 105,110 92,75" fill="#fb923c" stroke="#fef08a" strokeWidth="1.5" />
      {/* Right Crystal */}
      <polygon points="175,45 188,75 175,110 162,75" fill="#fb923c" stroke="#fef08a" strokeWidth="1.5" />
      <text x="140" y="74" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
        +1
      </text>
    </g>
  </svg>
);

export const VoteInspectorIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="140" cy="70" rx="90" ry="50" fill="#db2777" opacity="0.3" />
    {/* All-Seeing Inspection Eye */}
    <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.7))">
      <path d="M 80 70 Q 140 25 200 70 Q 140 115 80 70 Z" fill="#180728" stroke="#f472b6" strokeWidth="2.5" />
      <circle cx="140" cy="70" r="22" fill="#be185d" stroke="#fbcfe8" strokeWidth="2" />
      <circle cx="140" cy="70" r="10" fill="#0f172a" />
      <circle cx="144" cy="66" r="3" fill="#ffffff" />
      {/* Inspection rays */}
      <line x1="140" y1="16" x2="140" y2="28" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <line x1="140" y1="112" x2="140" y2="124" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="36" x2="100" y2="44" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
      <line x1="190" y1="36" x2="180" y2="44" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export const MainSelectorIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-32' }) => (
  <svg viewBox="0 0 280 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="140" cy="70" rx="90" ry="50" fill="#eab308" opacity="0.3" />
    {/* Destiny Scroll & Crown */}
    <g filter="drop-shadow(0px 6px 12px rgba(0,0,0,0.7))">
      {/* Open Parchment Scroll */}
      <path d="M 100 45 Q 140 40 180 45 L 175 105 Q 140 110 95 105 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
      {/* Royal Crown on Top */}
      <path d="M 115 45 L 110 25 L 125 35 L 140 18 L 155 35 L 170 25 L 165 45 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.8" />
      <circle cx="140" cy="18" r="2.5" fill="#ef4444" />
      <circle cx="110" cy="25" r="2" fill="#38bdf8" />
      <circle cx="170" cy="25" r="2" fill="#38bdf8" />
      {/* Scroll lines */}
      <line x1="115" y1="65" x2="160" y2="65" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      <line x1="115" y1="78" x2="155" y2="78" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
      <line x1="115" y1="91" x2="145" y2="91" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

// Unified Role Illustration Component
export const RoleIllustration: React.FC<{ role: string; className?: string }> = ({ role, className = 'w-full h-32' }) => {
  switch (role) {
    case 'ROLE_1_SWAPPER':
      return <RoleSwapperIllustration className={className} />;
    case 'ROLE_2_ROLLER':
      return <RoleRollerIllustration className={className} />;
    case 'ROLE_3_MULTIPLIER':
      return <VoteMultiplierIllustration className={className} />;
    case 'ROLE_4_INSPECTOR':
      return <VoteInspectorIllustration className={className} />;
    case 'ROLE_5_SELECTOR':
      return <MainSelectorIllustration className={className} />;
    case 'ROLE_6_CARD_SWAPPER':
    default:
      return <CardSwapperIllustration className={className} />;
  }
};


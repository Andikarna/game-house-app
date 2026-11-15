import { SkillDefinition, SkillType, AvatarId } from '../types';

export const SERVER_TICK_RATE = 20; // 20 ticks per second (50ms interval)
export const CLIENT_INPUT_RATE = 20; // client sends input every 50ms

export const DEFAULT_GAME_DURATION: Record<string, number> = {
  'classic-race': 180, // 3 minutes
  'survival-climb': 120, // 2 minutes
  'skill-battle': 150, // 2.5 minutes
  'classic': 600, // 10 minutes
  'quick': 300, // 5 minutes
};

export interface AvatarOption {
  id: AvatarId;
  name: string;
  subtitle: string;
  color: string;
  badge: string;
  tagline: string;
  spriteBase: string;
}

export const PRIMARY_AVATARS: AvatarId[] = [
  'budi',
  'ujang',
  'rara',
  'koko',
  'jaya',
  'bayu',
  'siti',
  'jago',
];

export function normalizeAvatarId(avatar?: string | null): AvatarId {
  if (!avatar) return 'budi';
  if (avatar === 'climber-red') return 'budi';
  if (avatar === 'climber-blue') return 'rara';
  if (avatar === 'climber-green') return 'koko';
  if (avatar === 'climber-yellow') return 'ujang';
  if (avatar === 'climber-purple') return 'siti';
  if (avatar === 'climber-orange') return 'jaya';
  return avatar as AvatarId;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'budi',
    name: 'Budi',
    subtitle: 'Semangat Merah Putih',
    color: '#EF4444',
    badge: '🇮🇩',
    tagline: 'Kaos putih & ikat kepala merah putih legendaris',
    spriteBase: '/assets/characters/budi',
  },
  {
    id: 'ujang',
    name: 'Ujang',
    subtitle: 'Jawara Madura',
    color: '#DC2626',
    badge: '🥊',
    tagline: 'Kaos loreng merah-putih & sarung tangan cengkeram',
    spriteBase: '/assets/characters/ujang',
  },
  {
    id: 'rara',
    name: 'Rara',
    subtitle: 'Gadis Visor Sporty',
    color: '#06B6D4',
    badge: '⚡',
    tagline: 'Kuncir kuda dinamis & visor sporty cyan',
    spriteBase: '/assets/characters/rara',
  },
  {
    id: 'koko',
    name: 'Koko',
    subtitle: 'Si Ceria Baju Hijau',
    color: '#10B981',
    badge: '🌿',
    tagline: 'Baju motif hijau tropis & topi visor oranye',
    spriteBase: '/assets/characters/koko',
  },
  {
    id: 'jaya',
    name: 'Jaya',
    subtitle: 'Rompi Oranye Energik',
    color: '#F97316',
    badge: '🔥',
    tagline: 'Rambut spike & rompi oranye penuh tenaga',
    spriteBase: '/assets/characters/jaya',
  },
  {
    id: 'bayu',
    name: 'Bayu',
    subtitle: 'Atlet Kilat Lincah',
    color: '#EA580C',
    badge: '🌪️',
    tagline: 'Refleks cepat & gaya pemanjat akrobatik',
    spriteBase: '/assets/characters/bayu',
  },
  {
    id: 'siti',
    name: 'Siti',
    subtitle: 'Caping Bambu & Cyber Neko',
    color: '#8B5CF6',
    badge: '🎧',
    tagline: 'Topi caping bambu & gamer headset telinga kucing',
    spriteBase: '/assets/characters/siti',
  },
  {
    id: 'jago',
    name: 'Jago',
    subtitle: 'Sang Legenda Sabuk Emas',
    color: '#F59E0B',
    badge: '👑',
    tagline: 'Jubah merah, kacamata hitam & sabuk emas juara',
    spriteBase: '/assets/characters/jago',
  },
  // Backward compatibility aliases for existing games/data
  {
    id: 'climber-red',
    name: 'Budi (Red)',
    subtitle: 'Semangat Merah Putih',
    color: '#EF4444',
    badge: '🇮🇩',
    tagline: 'Kaos putih & ikat kepala merah putih',
    spriteBase: '/assets/characters/budi',
  },
  {
    id: 'climber-blue',
    name: 'Rara (Blue)',
    subtitle: 'Gadis Visor Sporty',
    color: '#06B6D4',
    badge: '⚡',
    tagline: 'Kuncir kuda & visor sporty cyan',
    spriteBase: '/assets/characters/rara',
  },
  {
    id: 'climber-green',
    name: 'Koko (Green)',
    subtitle: 'Si Ceria Baju Hijau',
    color: '#10B981',
    badge: '🌿',
    tagline: 'Baju hijau tropis & topi visor',
    spriteBase: '/assets/characters/koko',
  },
  {
    id: 'climber-yellow',
    name: 'Ujang (Yellow)',
    subtitle: 'Jawara Madura',
    color: '#DC2626',
    badge: '🥊',
    tagline: 'Kaos loreng merah-putih',
    spriteBase: '/assets/characters/ujang',
  },
  {
    id: 'climber-purple',
    name: 'Siti (Purple)',
    subtitle: 'Caping & Cyber Neko',
    color: '#8B5CF6',
    badge: '🎧',
    tagline: 'Caping bambu & cyber neko headset',
    spriteBase: '/assets/characters/siti',
  },
  {
    id: 'climber-orange',
    name: 'Jaya (Orange)',
    subtitle: 'Rompi Oranye Energik',
    color: '#F97316',
    badge: '🔥',
    tagline: 'Rompi oranye penuh tenaga',
    spriteBase: '/assets/characters/jaya',
  },
];

export const SKILL_DEFINITIONS: Record<SkillType, SkillDefinition> = {
  iron_grip: {
    type: 'iron_grip',
    name: 'Iron Grip',
    description: 'Immunity to slipping and boosts grip strength by 50% for 5s.',
    cooldownSeconds: 15,
    durationSeconds: 5,
    icon: 'Shield',
    keybind: 'Q'
  },
  super_climb: {
    type: 'super_climb',
    name: 'Super Climb',
    description: 'Doubles climbing speed for 4s, but consumes 1.5x stamina.',
    cooldownSeconds: 20,
    durationSeconds: 4,
    icon: 'Zap',
    keybind: 'E'
  },
  recovery: {
    type: 'recovery',
    name: 'Quick Recovery',
    description: 'Instantly restores +30 Stamina and cleanses stun / daze.',
    cooldownSeconds: 25,
    durationSeconds: 0,
    icon: 'RefreshCw',
    keybind: 'Space'
  },
  banana_trap: {
    type: 'banana_trap',
    name: 'Banana Trap',
    description: 'Drops a slippery peel behind you. Opponents touching it slip down 10%.',
    cooldownSeconds: 25,
    durationSeconds: 15, // Trap stays on pole for 15s
    icon: 'AlertTriangle',
    keybind: 'Q'
  },
  wind_boost: {
    type: 'wind_boost',
    name: 'Wind Boost',
    description: 'A sudden tropical updraft pushes you up +12% height immediately.',
    cooldownSeconds: 30,
    durationSeconds: 1,
    icon: 'Wind',
    keybind: 'E'
  },
  legendary_climber: {
    type: 'legendary_climber',
    name: 'Legendary Climber',
    description: 'Ultimate power: Maximum grip, perfect balance, and +80% climb speed for 6s.',
    cooldownSeconds: 40,
    durationSeconds: 6,
    energyCost: 100,
    isUltimate: true,
    icon: 'Crown',
    keybind: 'R'
  }
};

export const PHYSICS_CONFIG = {
  baseClimbSpeed: 4.5, // % height per second at full stamina
  baseDescendSpeed: 8.0, // % height per second
  staminaDepletionClimb: 7.0, // stamina units per second while climbing
  staminaRegenIdle: 6.0, // stamina units per second while staying still
  balanceDriftBase: 12.0, // balance shifts left or right naturally
  balanceRecoverySpeed: 45.0, // balance adjustment speed with keys
  slipThreshold: 75.0, // balance > 75 or < -75 causes slipping
  slipDropDistance: 12.0, // % height dropped on slip
  stunDuration: 1.8, // seconds stunned after a slip
  energyGainRate: 3.5, // ultimate energy points per second of climbing
};

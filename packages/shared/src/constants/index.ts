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

export const AVATAR_OPTIONS: { id: AvatarId; name: string; color: string; badge: string }[] = [
  { id: 'climber-red', name: 'Garuda Red', color: '#EF4444', badge: '🔴' },
  { id: 'climber-blue', name: 'Samudra Blue', color: '#3B82F6', badge: '🔵' },
  { id: 'climber-green', name: 'Nusantara Green', color: '#10B981', badge: '🟢' },
  { id: 'climber-yellow', name: 'Surya Yellow', color: '#F59E0B', badge: '🟡' },
  { id: 'climber-purple', name: 'Kresna Purple', color: '#8B5CF6', badge: '🟣' },
  { id: 'climber-orange', name: 'Bara Orange', color: '#F97316', badge: '🟠' },
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

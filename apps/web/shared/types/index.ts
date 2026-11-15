export type GameId = 'panjat-pinang' | 'ludo' | 'obstacle-race' | 'card-battle' | 'mini-battle-arena';

export type GameMode = 'classic-race' | 'survival-climb' | 'skill-battle' | 'classic' | 'quick';

export type RoomStatus = 'lobby' | 'countdown' | 'in-game' | 'finished';

export type AvatarId = 
  | 'budi' 
  | 'ujang' 
  | 'rara' 
  | 'koko' 
  | 'jaya' 
  | 'bayu' 
  | 'siti' 
  | 'jago'
  | 'climber-red' 
  | 'climber-blue' 
  | 'climber-green' 
  | 'climber-yellow' 
  | 'climber-purple' 
  | 'climber-orange';

export interface Player {
  id: string; // Unique session ID
  socketId: string;
  nickname: string;
  avatar: AvatarId;
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface RoomSettings {
  name: string;
  gameId: GameId;
  gameMode: GameMode;
  maxPlayers: number;
  durationSeconds: number;
  isPrivate: boolean;
}

export interface RoomInfo {
  id: string;
  code: string;
  settings: RoomSettings;
  status: RoomStatus;
  hostId: string;
  players: Player[];
  createdAt: number;
}

export type SkillType = 
  | 'iron_grip'
  | 'super_climb'
  | 'recovery'
  | 'banana_trap'
  | 'wind_boost'
  | 'legendary_climber';

export interface SkillDefinition {
  type: SkillType;
  name: string;
  description: string;
  cooldownSeconds: number;
  durationSeconds: number;
  energyCost?: number;
  isUltimate?: boolean;
  icon: string;
  keybind: string;
}

export interface ActiveEffect {
  type: SkillType;
  durationRemaining: number;
}

export interface ClimberInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  recovery: boolean;
  timestamp: number;
}

export interface TrapObject {
  id: string;
  placedByPlayerId: string;
  heightPercentage: number; // 0 - 100
  lane: number; // 0 - 7
  createdAt: number;
  durationSeconds: number;
}

export interface ClimberPlayerState {
  playerId: string;
  lane: number; // Horizontal lane/offset around pole
  height: number; // 0 to 100 (% of pole)
  targetHeight: number;
  stamina: number; // 0 to 100
  balance: number; // -100 to +100 (0 is perfect center)
  grip: number; // 0 to 100
  climbingSpeed: number;
  energy: number; // 0 to 100 (charges over time / successful climbs)
  isClimbing: boolean;
  isSlipping: boolean;
  isStunned: boolean;
  stunTimer: number; // seconds remaining in stun
  activeEffects: ActiveEffect[];
  skillCooldowns: Record<SkillType, number>; // seconds remaining
  fallCount: number;
  skillsUsedCount: number;
  finishedAt?: number; // timestamp when reached 100%
  rank?: number;
}

export interface PanjatPinangGameState {
  gameId: 'panjat-pinang';
  gameMode: GameMode;
  status: RoomStatus;
  countdown: number;
  timerSecondsRemaining: number;
  totalDurationSeconds: number;
  climbers: Record<string, ClimberPlayerState>;
  traps: TrapObject[];
  winnerId: string | null;
  rankings: PlayerGameResult[];
  environmentSlipperiness: number; // increases in survival mode
}

export interface PlayerGameResult {
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  rank: number;
  finalHeight: number;
  completionTimeSeconds?: number;
  fallCount: number;
  skillsUsedCount: number;
  score: number;
}

export interface GameResultData {
  gameId: GameId;
  gameMode: GameMode;
  winner: PlayerGameResult | null;
  rankings: PlayerGameResult[];
  endedAt: number;
}

// =========================================================================
// LUDO BOARD GAME TYPES
// =========================================================================

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export type LudoTokenState = 'base' | 'track' | 'home-stretch' | 'finished';

export interface LudoToken {
  id: number; // 0, 1, 2, 3
  color: LudoColor;
  state: LudoTokenState;
  stepCount: number; // 0 = base, 1-51 = track, 52-56 = home stretch, 57 = finished (center)
  trackPosition: number; // 0 to 51 on global track when state === 'track'
}

export interface LudoPlayerState {
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  color: LudoColor;
  tokens: LudoToken[];
  finishedCount: number; // 0 to 4 tokens finished
  rank?: number;
  hasRolled: boolean;
  canRoll: boolean;
  consecutiveSixes: number;
  isConnected: boolean;
}

export interface LudoGameState {
  gameId: 'ludo';
  gameMode: GameMode;
  status: RoomStatus;
  currentTurnPlayerId: string;
  currentTurnColor: LudoColor;
  diceValue: number | null; // 1 to 6
  isRolling: boolean;
  turnTimeRemaining: number;
  players: Record<string, LudoPlayerState>;
  playerOrder: string[]; // List of playerIds in turn order
  validMoves: number[]; // Token indices (0 to 3) that current player can move
  lastMoveNotice?: string;
  winnerId: string | null;
  rankings: PlayerGameResult[];
}

export type LudoInput = 
  | { action: 'roll-dice' }
  | { action: 'move-token'; tokenIndex: number };

export type AnyGameState = PanjatPinangGameState | LudoGameState;

// =========================================================================
// IN-GAME EMOTES SYSTEM
// =========================================================================

export type EmoteId = 
  | 'ggwp'
  | 'aaghh'
  | 'hahaha'
  | 'ez'
  | 'cepat'
  | 'otw'
  | 'santuy'
  | 'capekk'
  | 'trap'
  | 'sorry'
  | 'puyeng'
  | 'wush'
  | 'wow'
  | 'ampun'
  | 'jagoan'
  | 'licin'
  | 'merosot'
  | 'rip'
  | 'awas'
  | 'merdeka'
  | 'juara'
  | 'dakap'
  | 'tanya'
  | 'pelicin';

export type EmoteCategory = 'all' | 'reaction' | 'taunt' | 'gameplay' | 'festival';

export interface EmoteDefinition {
  id: EmoteId;
  label: string;
  category: 'reaction' | 'taunt' | 'gameplay' | 'festival';
  character?: string;
  image: string;
  description: string;
}

export interface ActiveEmoteEvent {
  id: string; // unique random instance ID
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  emoteId: EmoteId;
  timestamp: number;
}

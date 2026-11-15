export type GameId = 'panjat-pinang' | 'ludo' | 'obstacle-race' | 'card-battle' | 'mini-battle-arena';
export type GameMode = 'classic-race' | 'survival-climb' | 'skill-battle' | 'classic' | 'quick';
export type RoomStatus = 'lobby' | 'countdown' | 'in-game' | 'finished';
export type AvatarId = 'budi' | 'ujang' | 'rara' | 'koko' | 'jaya' | 'bayu' | 'siti' | 'jago' | 'climber-red' | 'climber-blue' | 'climber-green' | 'climber-yellow' | 'climber-purple' | 'climber-orange';
export interface Player {
    id: string;
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
export type SkillType = 'iron_grip' | 'super_climb' | 'recovery' | 'banana_trap' | 'wind_boost' | 'legendary_climber';
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
    heightPercentage: number;
    lane: number;
    createdAt: number;
    durationSeconds: number;
}
export interface ClimberPlayerState {
    playerId: string;
    lane: number;
    height: number;
    targetHeight: number;
    stamina: number;
    balance: number;
    grip: number;
    climbingSpeed: number;
    energy: number;
    isClimbing: boolean;
    isSlipping: boolean;
    isStunned: boolean;
    stunTimer: number;
    activeEffects: ActiveEffect[];
    skillCooldowns: Record<SkillType, number>;
    fallCount: number;
    skillsUsedCount: number;
    finishedAt?: number;
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
    environmentSlipperiness: number;
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
export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';
export type LudoTokenState = 'base' | 'track' | 'home-stretch' | 'finished';
export interface LudoToken {
    id: number;
    color: LudoColor;
    state: LudoTokenState;
    stepCount: number;
    trackPosition: number;
}
export interface LudoPlayerState {
    playerId: string;
    nickname: string;
    avatar: AvatarId;
    color: LudoColor;
    tokens: LudoToken[];
    finishedCount: number;
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
    diceValue: number | null;
    isRolling: boolean;
    turnTimeRemaining: number;
    players: Record<string, LudoPlayerState>;
    playerOrder: string[];
    validMoves: number[];
    lastMoveNotice?: string;
    winnerId: string | null;
    rankings: PlayerGameResult[];
}
export type LudoInput = {
    action: 'roll-dice';
} | {
    action: 'move-token';
    tokenIndex: number;
};
export type AnyGameState = PanjatPinangGameState | LudoGameState;
export type EmoteId = 'ggwp' | 'aaghh' | 'hahaha' | 'ez' | 'cepat' | 'otw' | 'santuy' | 'capekk' | 'trap' | 'sorry' | 'puyeng' | 'wush' | 'wow' | 'ampun' | 'jagoan' | 'licin' | 'merosot' | 'rip' | 'awas' | 'merdeka' | 'juara' | 'dakap' | 'tanya' | 'pelicin';
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
    id: string;
    playerId: string;
    nickname: string;
    avatar: AvatarId;
    emoteId: EmoteId;
    timestamp: number;
}

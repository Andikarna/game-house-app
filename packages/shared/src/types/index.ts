export type GameId = 'panjat-pinang' | 'ludo' | 'impostor-desa' | 'obstacle-race' | 'card-battle' | 'mini-battle-arena' | 'hidden-team';

export type GameMode = 'classic-race' | 'survival-climb' | 'skill-battle' | 'classic' | 'quick' | 'impostor-classic' | 'hidden-team-standard' | 'hidden-team-4r' | 'hidden-team-5r' | 'hidden-team-6r';

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
  isBot?: boolean;
  score?: number;
}

export interface RoomSettings {
  name: string;
  gameId: GameId;
  gameMode: GameMode;
  maxPlayers: number;
  durationSeconds: number;
  isPrivate: boolean;
  impostorCategories?: ImpostorCategory[];
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
  isBot?: boolean;
}

export interface LudoGameState {
  gameId: 'ludo';
  gameMode: GameMode;
  stateVersion?: number;
  status: RoomStatus;
  currentTurnPlayerId: string;
  currentTurnColor: LudoColor;
  diceValue: number | null; // 1 to 6
  isRolling: boolean;
  hasRolled?: boolean;
  turnTimeRemaining: number;
  turnStartedAt?: number | null;
  passAt?: number | null;
  consecutiveSixes?: number;
  players: Record<string, LudoPlayerState>;
  playerOrder: string[]; // List of playerIds in turn order
  validMoves: number[]; // Token indices (0 to 3) that current player can move
  lastMoveNotice?: string;
  winnerId: string | null;
  rankings: PlayerGameResult[];
}

export type LudoInput = 
  | { action: 'roll-dice' }
  | { action: 'move-token'; tokenIndex: number }
  | { action: 'pass-turn' };

// =========================================================================
// IMPOSTOR DESA GAME TYPES
// =========================================================================

export type ImpostorCategory = 
  | 'pertanian'
  | 'hewan'
  | 'pasar-desa'
  | 'kehidupan-desa'
  | 'makanan'
  | 'perkakas-alat'
  | 'alam-geografi'
  | 'permainan-tradisional'
  | 'kesenian-budaya'
  | 'transportasi-desa';

export type ImpostorPhase = 
  | 'role-reveal'
  | 'clue'
  | 'discussion'
  | 'voting'
  | 'revote'
  | 'impostor-guess'
  | 'result';

export type ImpostorPlayerRole = 'villager' | 'impostor';

export interface ImpostorPlayerPublic {
  id: string;
  nickname: string;
  avatar: AvatarId;
  isConnected: boolean;
  isReadyForRole: boolean;
  hasGivenClue: boolean;
  hasVoted: boolean;
  isEliminated?: boolean;
  isHost?: boolean;
  isBot?: boolean;
  score?: number;
}

export interface ImpostorClueEntry {
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  clue: string;
  turnNumber: number;
}

export interface ImpostorChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  message: string;
  timestamp: number;
}

export interface ImpostorVoteSummary {
  candidateId: string;
  candidateNickname: string;
  candidateAvatar: AvatarId;
  voteCount: number;
  voterIds: string[];
}

export interface ImpostorPrivateRoleData {
  playerId: string;
  role: ImpostorPlayerRole;
  category: string;
  categoryLabel: string;
  secretWord?: string; // Not sent to the impostor!
  allCategories?: string[];
  camouflageThemes?: string[]; // Subtle thematic traits for disguise or villager tactics
}

export interface ImpostorLeaderboardEntry {
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  role: ImpostorPlayerRole;
  isWinner: boolean;
  pointsAdded: number;
  totalScore: number;
}

export interface ImpostorResultData {
  winner: 'villagers' | 'impostor';
  winReason: string;
  impostorPlayerId: string;
  impostorNickname: string;
  impostorAvatar: AvatarId;
  secretWord: string;
  category: string;
  categoryLabel: string;
  votes: Record<string, string>; // voterId -> targetId
  voteSummaries: ImpostorVoteSummary[];
  impostorGuess?: string | null;
  guessIsCorrect?: boolean;
  awardedScores?: Record<string, number>;
  leaderboard?: ImpostorLeaderboardEntry[];
}

export interface ImpostorPublicGameState {
  gameId: 'impostor-desa';
  gameMode: GameMode;
  status: RoomStatus;
  phase: ImpostorPhase;
  phaseTimeRemaining: number;
  phaseTotalTime: number;
  roundNumber: number;
  category: ImpostorCategory;
  categoryLabel: string;
  players: Record<string, ImpostorPlayerPublic>;
  playerOrder: string[]; // Clue turn order
  currentClueTurnIndex: number;
  currentTurnPlayerId: string | null;
  clues: ImpostorClueEntry[];
  eligibleCandidateIds: string[]; // For voting & revote
  votedPlayerIds: string[]; // Only list of playerIds who submitted vote (secret!)
  chatMessages?: ImpostorChatMessage[];
  caughtImpostorId: string | null;
  impostorGuess?: string | null;
  guessIsCorrect?: boolean;
  winner: 'villagers' | 'impostor' | null;
  winReason?: string;
  resultData?: ImpostorResultData | null;
}

export type ImpostorInput = 
  | { action: 'ready-role' }
  | { action: 'submit-clue'; clue: string }
  | { action: 'start-voting' }
  | { action: 'submit-vote'; targetPlayerId: string }
  | { action: 'submit-guess'; guessedWord: string }
  | { action: 'send-chat'; message: string };

export type AnyGameState = PanjatPinangGameState | LudoGameState | ImpostorPublicGameState;

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

// ==========================================
// HIDDEN TEAM: SECRET ROLE TYPES
// ==========================================

export type HiddenTeamFaction = 'RED' | 'BLUE' | 'NEUTRAL';

export type HiddenTeamRole =
  | 'ROLE_1_SWAPPER'      // Role 1 — Role Ability Swapper
  | 'ROLE_2_ROLLER'       // Role 2 — Voting Eligibility Roller
  | 'ROLE_3_MULTIPLIER'   // Role 3 — Vote Multiplier
  | 'ROLE_4_INSPECTOR'    // Role 4 — Vote Inspector
  | 'ROLE_5_SELECTOR'     // Role 5 — Main Card Selector
  | 'ROLE_6_CARD_SWAPPER';// Role 6 — Full Vote Card Swapper

export type HiddenTeamPhase =
  | 'MATCH_WAITING'
  | 'MATCH_INITIALIZING'
  | 'ROUND_INITIALIZING'
  | 'MAIN_CARD_SELECTION'
  | 'ACTION_PHASE'
  | 'VOTING_SUBMISSION'
  | 'VOTE_MANIPULATION'
  | 'ROUND_RESOLUTION'
  | 'NEXT_ROUND'
  | 'MATCH_RESOLUTION'
  | 'MATCH_FINISHED';

export interface VoteCard {
  id: string;
  faction: HiddenTeamFaction;
  title: string;
  description: string;
}

export interface MainCard {
  id: string;
  title: string;
  scenario: string;
  teamFlag: HiddenTeamFaction;
  description: string;
  illustration: string;
  roundObjective: string;
}

export interface HiddenTeamPlayerPublic {
  id: string;
  nickname: string;
  avatar: AvatarId;
  slotNumber: number; // Fixed turn slot 1-6
  isConnected: boolean;
  isBot: boolean;
  hasActedThisSlot: boolean;
  hasSubmittedVotes: boolean;
}

export interface HiddenTeamPlayerPrivate {
  playerId: string;
  team: HiddenTeamFaction;
  slotNumber: number;
  currentRole: HiddenTeamRole;
  originalRole: HiddenTeamRole;
  voteCards: VoteCard[];
  role2CanVote: boolean | null;
  role4InspectedCard: VoteCard | null;
  role5CandidateCards: MainCard[] | null;
  hasActed: boolean;
  hasSubmittedVotes: boolean;
}

export type HiddenTeamActionPayload =
  | { action: 'pass' }
  | { action: 'role_1_swap'; targetPlayerIdA: string; targetPlayerIdB: string }
  | { action: 'role_2_roll' }
  | { action: 'role_3_multiply'; targetPlayerId: string }
  | { action: 'role_4_inspect'; decision: 'KEEP' | 'DISCARD' }
  | { action: 'role_5_select'; selectedCardId: string }
  | { action: 'role_6_swap_cards'; targetPlayerIdA: string; targetPlayerIdB: string };

export interface HiddenTeamRoundResult {
  roundNumber: number;
  activeMainCard: MainCard; // Team flag revealed at round resolution
  originalVotes: { RED: number; BLUE: number; NEUTRAL: number };
  bonusVotes: { RED: number; BLUE: number; NEUTRAL: number };
  discardedVotes: { RED: number; BLUE: number; NEUTRAL: number };
  finalVotes: { RED: number; BLUE: number; NEUTRAL: number };
  winningTeam: HiddenTeamFaction | null;
  isTieOrNoWin: boolean;
  reason: string;
  roundWinsSoFar: { RED: number; BLUE: number; NEUTRAL: number };
}

export interface HiddenTeamPlayerIdentityReveal {
  playerId: string;
  nickname: string;
  avatar: AvatarId;
  slotNumber: number;
  team: HiddenTeamFaction;
  originalRole: HiddenTeamRole;
  finalRole: HiddenTeamRole;
}

export interface HiddenTeamMatchResult {
  winner: HiddenTeamFaction | 'DRAW';
  finalRoundWins: { RED: number; BLUE: number; NEUTRAL: number };
  totalRounds: number;
  playerIdentities: HiddenTeamPlayerIdentityReveal[];
  roundHistory: HiddenTeamRoundResult[];
}

export interface HiddenTeamPublicGameState {
  gameId: 'hidden-team';
  matchId: string;
  roundNumber: number;
  totalRounds: number;
  phase: HiddenTeamPhase;
  phaseTimer: number;
  phaseTotalTime: number;
  currentTurnSlot: number; // 1-6
  activeMainCard: (Omit<MainCard, 'teamFlag'> & { teamFlag?: HiddenTeamFaction }) | null;
  players: Record<string, HiddenTeamPlayerPublic>;
  playerSlots: string[]; // [slot1PlayerId, slot2PlayerId, ..., slot6PlayerId]
  roundWins: { RED: number; BLUE: number; NEUTRAL: number };
  currentRoundResult: HiddenTeamRoundResult | null;
  matchResult: HiddenTeamMatchResult | null;
  recentLogs: string[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  color?: LudoColor | string;
  avatar: AvatarId;
  message: string;
  timestamp: number;
}

export interface VoteKickState {
  targetPlayerId: string;
  targetNickname: string;
  targetColor?: string;
  initiatedByPlayerId: string;
  initiatedByNickname: string;
  votes: Record<string, 'yes' | 'no'>;
  yesCount: number;
  noCount: number;
  requiredVotes: number;
  expiresAt: number;
}



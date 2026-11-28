import { 
  RoomInfo, 
  RoomSettings, 
  Player, 
  PanjatPinangGameState, 
  LudoGameState,
  SnakeLadderGameState,
  ImpostorPublicGameState,
  ImpostorPrivateRoleData,
  ImpostorResultData,
  ImpostorInput,
  AnyGameState,
  ClimberInput, 
  LudoInput,
  SnakeLadderInput,
  UnoInput,
  UnoGameState,
  UnoActionFx,
  SkillType, 
  GameResultData,
  AvatarId,
  EmoteId,
  HiddenTeamActionPayload,
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPrivate,
  HiddenTeamRoundResult,
  HiddenTeamMatchResult,
  ChatMessage,
  VoteKickState
} from '../types';

export interface ClientToServerEvents {
  // Room Lifecycle
  'room:create': (
    payload: {
      nickname: string;
      avatar: AvatarId;
      roomName: string;
      gameId: string;
      gameMode: string;
      maxPlayers: number;
      playerId?: string;
    },
    callback: (response: { success: boolean; room?: RoomInfo; error?: string }) => void
  ) => void;

  'room:join': (
    payload: {
      roomCode: string;
      nickname: string;
      avatar: AvatarId;
      playerId?: string;
    },
    callback: (response: { success: boolean; room?: RoomInfo; error?: string }) => void
  ) => void;

  'room:leave': () => void;
  'room:ready': (isReady: boolean) => void;
  'room:update-settings': (settings: Partial<RoomSettings>) => void;
  'room:kick-player': (targetPlayerId: string) => void;
  'room:add-bot': () => void;
  'room:remove-bot': (payload?: { botId?: string }) => void;
  'room:fill-bots': () => void;
  'room:clear-bots': () => void;

  // Game Lifecycle
  'game:start': () => void;
  'game:input': (input: ClimberInput | LudoInput | SnakeLadderInput | UnoInput | ImpostorInput | any) => void;
  'player:skill': (skill: SkillType) => void;
  'game:restart': () => void; // Host triggers back to lobby for rematch
  'game:emote': (payload: { emoteId: EmoteId }) => void;

  // Impostor Desa specific client actions
  'impostor:ready-role': () => void;
  'impostor:submit-clue': (payload: { clue: string }) => void;
  'impostor:start-voting': () => void;
  'impostor:submit-vote': (payload: { targetPlayerId: string }) => void;
  'impostor:submit-guess': (payload: { guessedWord: string }) => void;
  'impostor:send-chat': (payload: { message: string }) => void;

  // Hidden Team specific client actions
  'hidden-team:select-main-card': (payload: { cardId: string }) => void;
  'hidden-team:execute-action': (payload: HiddenTeamActionPayload) => void;
  'hidden-team:submit-votes': (payload: { cardIds: string[] }) => void;
  'hidden-team:inspect-decision': (payload: { decision: 'KEEP' | 'DISCARD' }) => void;

  // Free Chat in Gameplay
  'game:chat': (payload: { message: string }) => void;

  // Vote Kick during Gameplay (Player > 2)
  'game:vote-kick-start': (payload: { targetPlayerId: string; reason?: string }) => void;
  'game:vote-kick-vote': (payload: { vote: 'yes' | 'no' }) => void;

  // Heartbeat / Sync
  'ping:check': (clientTimestamp: number, callback: (clientTimestamp: number) => void) => void;
}

export interface ServerToClientEvents {
  // Room updates
  'room:created': (room: RoomInfo) => void;
  'room:updated': (room: RoomInfo) => void;
  'room:player-joined': (player: Player) => void;
  'room:player-left': (data: { playerId: string; nickname: string; newHostId?: string }) => void;
  'room:closed': (reason: string) => void;
  'room:kicked': (reason: string) => void;

  // Game updates
  'game:countdown': (count: number) => void;
  'game:start': (initialState: AnyGameState | any) => void;
  'game:started': (initialState: AnyGameState | any) => void;
  'game:state': (state: AnyGameState | any) => void;
  'game:ludo_state': (state: AnyGameState | any) => void;
  'game:snake_state': (state: AnyGameState | any) => void;
  'game:uno_state': (state: UnoGameState) => void;
  'uno:fx': (fx: UnoActionFx) => void;
  'game:finished': (results: GameResultData | any) => void;
  
  // Impostor Desa Authoritative Private & State events
  'impostor:private-role': (data: ImpostorPrivateRoleData) => void;
  'impostor:state': (state: ImpostorPublicGameState) => void;
  'impostor:result': (data: ImpostorResultData) => void;

  // Hidden Team Authoritative Private & State events
  'hidden-team:private-state': (data: HiddenTeamPlayerPrivate) => void;
  'hidden-team:state': (state: HiddenTeamPublicGameState) => void;
  'hidden-team:round-result': (data: HiddenTeamRoundResult) => void;
  'hidden-team:match-result': (data: HiddenTeamMatchResult) => void;

  // Game events
  'player:skill-used': (data: { playerId: string; skill: SkillType; nickname: string }) => void;
  'player:fallen': (data: { playerId: string; heightDropped: number; nickname: string }) => void;
  'player:recovered': (data: { playerId: string; nickname: string }) => void;
  'player:disconnected': (data: { playerId: string; nickname: string }) => void;
  
  // In-Game Emote Broadcast
  'game:emote': (data: { 
    id: string;
    playerId: string; 
    nickname: string; 
    avatar: AvatarId; 
    emoteId: EmoteId; 
    timestamp: number; 
  }) => void;

  // Free Chat Message Broadcast
  'game:chat-message': (data: ChatMessage) => void;

  // Vote Kick Broadcasts
  'game:vote-kick-started': (data: VoteKickState) => void;
  'game:vote-kick-updated': (data: { targetPlayerId: string; yesCount: number; noCount: number; requiredVotes: number }) => void;
  'game:vote-kick-ended': (data: { targetPlayerId: string; targetNickname: string; kicked: boolean; reason: string }) => void;

  // Errors / notifications
  'error:message': (message: string) => void;
}

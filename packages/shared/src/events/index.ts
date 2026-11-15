import { 
  RoomInfo, 
  RoomSettings, 
  Player, 
  PanjatPinangGameState, 
  LudoGameState,
  AnyGameState,
  ClimberInput, 
  LudoInput,
  SkillType, 
  GameResultData,
  AvatarId
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

  // Game Lifecycle
  'game:start': () => void;
  'game:input': (input: ClimberInput | LudoInput | any) => void;
  'player:skill': (skill: SkillType) => void;
  'game:restart': () => void; // Host triggers back to lobby for rematch

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
  'game:started': (initialState: AnyGameState | any) => void;
  'game:state': (state: AnyGameState | any) => void;
  'game:finished': (results: GameResultData) => void;
  
  // Game events
  'player:skill-used': (data: { playerId: string; skill: SkillType; nickname: string }) => void;
  'player:fallen': (data: { playerId: string; heightDropped: number; nickname: string }) => void;
  'player:recovered': (data: { playerId: string; nickname: string }) => void;
  'player:disconnected': (data: { playerId: string; nickname: string }) => void;
  
  // Errors / notifications
  'error:message': (message: string) => void;
}

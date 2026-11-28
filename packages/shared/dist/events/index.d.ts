import { RoomInfo, RoomSettings, Player, ImpostorPublicGameState, ImpostorPrivateRoleData, ImpostorResultData, ImpostorInput, AnyGameState, ClimberInput, LudoInput, SnakeLadderInput, UnoInput, UnoGameState, UnoActionFx, SkillType, GameResultData, AvatarId, EmoteId, HiddenTeamActionPayload, HiddenTeamPublicGameState, HiddenTeamPlayerPrivate, HiddenTeamRoundResult, HiddenTeamMatchResult, ChatMessage, VoteKickState } from '../types';
export interface ClientToServerEvents {
    'room:create': (payload: {
        nickname: string;
        avatar: AvatarId;
        roomName: string;
        gameId: string;
        gameMode: string;
        maxPlayers: number;
        playerId?: string;
    }, callback: (response: {
        success: boolean;
        room?: RoomInfo;
        error?: string;
    }) => void) => void;
    'room:join': (payload: {
        roomCode: string;
        nickname: string;
        avatar: AvatarId;
        playerId?: string;
    }, callback: (response: {
        success: boolean;
        room?: RoomInfo;
        error?: string;
    }) => void) => void;
    'room:leave': () => void;
    'room:ready': (isReady: boolean) => void;
    'room:update-settings': (settings: Partial<RoomSettings>) => void;
    'room:kick-player': (targetPlayerId: string) => void;
    'room:add-bot': () => void;
    'room:remove-bot': (payload?: {
        botId?: string;
    }) => void;
    'room:fill-bots': () => void;
    'room:clear-bots': () => void;
    'game:start': () => void;
    'game:input': (input: ClimberInput | LudoInput | SnakeLadderInput | UnoInput | ImpostorInput | any) => void;
    'player:skill': (skill: SkillType) => void;
    'game:restart': () => void;
    'game:emote': (payload: {
        emoteId: EmoteId;
    }) => void;
    'impostor:ready-role': () => void;
    'impostor:submit-clue': (payload: {
        clue: string;
    }) => void;
    'impostor:start-voting': () => void;
    'impostor:submit-vote': (payload: {
        targetPlayerId: string;
    }) => void;
    'impostor:submit-guess': (payload: {
        guessedWord: string;
    }) => void;
    'impostor:send-chat': (payload: {
        message: string;
    }) => void;
    'hidden-team:select-main-card': (payload: {
        cardId: string;
    }) => void;
    'hidden-team:execute-action': (payload: HiddenTeamActionPayload) => void;
    'hidden-team:submit-votes': (payload: {
        cardIds: string[];
    }) => void;
    'hidden-team:inspect-decision': (payload: {
        decision: 'KEEP' | 'DISCARD';
    }) => void;
    'game:chat': (payload: {
        message: string;
    }) => void;
    'game:vote-kick-start': (payload: {
        targetPlayerId: string;
        reason?: string;
    }) => void;
    'game:vote-kick-vote': (payload: {
        vote: 'yes' | 'no';
    }) => void;
    'ping:check': (clientTimestamp: number, callback: (clientTimestamp: number) => void) => void;
}
export interface ServerToClientEvents {
    'room:created': (room: RoomInfo) => void;
    'room:updated': (room: RoomInfo) => void;
    'room:player-joined': (player: Player) => void;
    'room:player-left': (data: {
        playerId: string;
        nickname: string;
        newHostId?: string;
    }) => void;
    'room:closed': (reason: string) => void;
    'room:kicked': (reason: string) => void;
    'game:countdown': (count: number) => void;
    'game:start': (initialState: AnyGameState | any) => void;
    'game:started': (initialState: AnyGameState | any) => void;
    'game:state': (state: AnyGameState | any) => void;
    'game:ludo_state': (state: AnyGameState | any) => void;
    'game:snake_state': (state: AnyGameState | any) => void;
    'game:uno_state': (state: UnoGameState) => void;
    'uno:fx': (fx: UnoActionFx) => void;
    'game:finished': (results: GameResultData | any) => void;
    'impostor:private-role': (data: ImpostorPrivateRoleData) => void;
    'impostor:state': (state: ImpostorPublicGameState) => void;
    'impostor:result': (data: ImpostorResultData) => void;
    'hidden-team:private-state': (data: HiddenTeamPlayerPrivate) => void;
    'hidden-team:state': (state: HiddenTeamPublicGameState) => void;
    'hidden-team:round-result': (data: HiddenTeamRoundResult) => void;
    'hidden-team:match-result': (data: HiddenTeamMatchResult) => void;
    'player:skill-used': (data: {
        playerId: string;
        skill: SkillType;
        nickname: string;
    }) => void;
    'player:fallen': (data: {
        playerId: string;
        heightDropped: number;
        nickname: string;
    }) => void;
    'player:recovered': (data: {
        playerId: string;
        nickname: string;
    }) => void;
    'player:disconnected': (data: {
        playerId: string;
        nickname: string;
    }) => void;
    'game:emote': (data: {
        id: string;
        playerId: string;
        nickname: string;
        avatar: AvatarId;
        emoteId: EmoteId;
        timestamp: number;
    }) => void;
    'game:chat-message': (data: ChatMessage) => void;
    'game:vote-kick-started': (data: VoteKickState) => void;
    'game:vote-kick-updated': (data: {
        targetPlayerId: string;
        yesCount: number;
        noCount: number;
        requiredVotes: number;
    }) => void;
    'game:vote-kick-ended': (data: {
        targetPlayerId: string;
        targetNickname: string;
        kicked: boolean;
        reason: string;
    }) => void;
    'error:message': (message: string) => void;
}

import { 
  GameId, 
  GameMode, 
  RoomSettings, 
  Player, 
  GameResultData 
} from '@gamehouse/shared';
import { Server as SocketIOServer } from 'socket.io';

export interface GameModule {
  readonly id: GameId;
  readonly name: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly availableModes: GameMode[];

  initialize(
    roomId: string, 
    players: Player[], 
    settings: RoomSettings, 
    io: SocketIOServer
  ): void;

  start(): void;
  update(deltaTime: number): void;
  handleInput(playerId: string, input: any): void;
  handleSkill(playerId: string, skill: any): void;
  handlePlayerDisconnect(playerId: string): void;
  handlePlayerReconnect(player: Player): void;
  isFinished(): boolean;
  getState(): any;
  getStateForPlayer?(playerId: string): any;
  shouldBroadcastTick?(): boolean;
  getResults(): GameResultData;
  cleanup(): void;
}

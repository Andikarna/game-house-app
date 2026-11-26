import { GameId } from '@gamehouse/shared';
import { GameModule } from '../core/GameModule';
import { PanjatPinangGame } from './panjat-pinang/PanjatPinangGame';
import { LudoGame } from './ludo/LudoGame';
import { SnakeLadderGame } from './snake-ladder/SnakeLadderGame';
import { ImpostorDesaGame } from './impostor-desa/ImpostorDesaGame';
import { HiddenTeamGame } from './hidden-team/HiddenTeamGame';

export class GameRegistry {
  private static games: Map<GameId, () => GameModule> = new Map();

  public static register(gameId: GameId, factory: () => GameModule): void {
    this.games.set(gameId, factory);
  }

  public static create(gameId: GameId): GameModule | null {
    const factory = this.games.get(gameId);
    if (!factory) return null;
    return factory();
  }

  public static getAvailableGameIds(): GameId[] {
    return Array.from(this.games.keys());
  }
}

// Register games: Panjat Pinang Battle, Ludo Party, Impostor Desa, & Hidden Team: Secret Role
GameRegistry.register('panjat-pinang', () => new PanjatPinangGame());
GameRegistry.register('ludo', () => new LudoGame());
GameRegistry.register('snake-ladder', () => new SnakeLadderGame());
GameRegistry.register('impostor-desa', () => new ImpostorDesaGame());
GameRegistry.register('hidden-team', () => new HiddenTeamGame());

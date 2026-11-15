import { GameId } from '@gamehouse/shared';
import { GameModule } from '../core/GameModule';
import { PanjatPinangGame } from './panjat-pinang/PanjatPinangGame';
import { LudoGame } from './ludo/LudoGame';

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

// Register games: Panjat Pinang Battle & Ludo Party
GameRegistry.register('panjat-pinang', () => new PanjatPinangGame());
GameRegistry.register('ludo', () => new LudoGame());

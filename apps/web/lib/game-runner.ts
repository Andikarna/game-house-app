import { RoomInfo, Player } from '../shared';
import { LudoGame } from './games/ludo/LudoGame';
import { PanjatPinangGame } from './games/panjat-pinang/PanjatPinangGame';

const dummyIo: any = {
  to: () => ({
    emit: () => {},
  }),
};

export function createInitialGameState(room: RoomInfo): any {
  if (room.settings.gameId === 'ludo') {
    const ludo = new LudoGame();
    ludo.initialize(room.id, room.players, room.settings, dummyIo);
    return ludo.getState();
  } else {
    const panjat = new PanjatPinangGame();
    panjat.initialize(room.id, room.players, room.settings, dummyIo);
    return panjat.getState();
  }
}

export function processLudoAction(
  room: RoomInfo,
  currentGameState: any,
  playerId: string,
  actionData: any
): { gameState: any; results: any | null } {
  const ludo = new LudoGame();
  ludo.initialize(room.id, room.players, room.settings, dummyIo);

  if (currentGameState) {
    // Restore state from JSON
    (ludo as any).currentTurn = currentGameState.currentTurn;
    (ludo as any).diceValue = currentGameState.diceValue;
    (ludo as any).hasRolled = currentGameState.hasRolled;
    (ludo as any).validMoves = currentGameState.validMoves || [];
    (ludo as any).winnerId = currentGameState.winnerId;
    (ludo as any).finished = currentGameState.finished;
    (ludo as any).turnTimeRemaining = currentGameState.turnTimeRemaining;
    (ludo as any).lastMoveNotice = currentGameState.lastMoveNotice;
    (ludo as any).rankings = currentGameState.rankings || [];

    if (currentGameState.players) {
      Object.entries(currentGameState.players).forEach(([pId, pState]: [string, any]) => {
        (ludo as any).players.set(pId, pState);
      });
    }
  }

  // Handle the action
  if (actionData.action === 'roll-dice' || actionData.action === 'move-token') {
    ludo.handleInput(playerId, actionData);
  } else if (actionData.type === 'roll') {
    ludo.handleInput(playerId, { action: 'roll-dice' });
  } else if (actionData.type === 'select_token' || actionData.type === 'move') {
    ludo.handleInput(playerId, { action: 'move-token', tokenIndex: actionData.tokenIndex ?? actionData.tokenId ?? 0 });
  } else {
    ludo.handleInput(playerId, actionData as any);
  }

  const newGameState = ludo.getState();
  const results = ludo.isFinished() ? ludo.getResults() : null;

  return { gameState: newGameState, results };
}

export function processPanjatAction(
  room: RoomInfo,
  currentGameState: any,
  playerId: string,
  actionData: any
): { gameState: any; results: any | null } {
  const panjat = new PanjatPinangGame();
  panjat.initialize(room.id, room.players, room.settings, dummyIo);

  if (currentGameState) {
    (panjat as any).state = { ...currentGameState };
  }

  if (actionData.type === 'input' && actionData.input) {
    panjat.handleInput(playerId, actionData.input);
  } else if (actionData.type === 'skill' && actionData.skill) {
    panjat.handleSkill(playerId, actionData.skill);
  }

  // Advance simulation step
  panjat.update(0.1);

  const newGameState = panjat.getState();
  const results = panjat.isFinished() ? panjat.getResults() : null;

  return { gameState: newGameState, results };
}

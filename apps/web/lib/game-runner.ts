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

function restoreLudoState(ludo: LudoGame, currentGameState: any): void {
  if (!currentGameState) return;

  if (currentGameState.players) {
    Object.entries(currentGameState.players).forEach(([pId, pState]: [string, any]) => {
      (ludo as any).players.set(pId, pState);
    });
  }

  if (Array.isArray(currentGameState.playerOrder) && currentGameState.playerOrder.length > 0) {
    (ludo as any).playerOrder = currentGameState.playerOrder;
  }

  if (currentGameState.currentTurnPlayerId && (ludo as any).playerOrder) {
    const idx = (ludo as any).playerOrder.indexOf(currentGameState.currentTurnPlayerId);
    if (idx !== -1) {
      (ludo as any).currentTurnIndex = idx;
    }
  }

  (ludo as any).diceValue = currentGameState.diceValue ?? null;
  (ludo as any).hasRolled = Boolean(currentGameState.hasRolled);
  (ludo as any).validMoves = currentGameState.validMoves || [];
  (ludo as any).winnerId = currentGameState.winnerId || null;
  (ludo as any).finished = Boolean(currentGameState.finished);
  (ludo as any).lastMoveNotice = currentGameState.lastMoveNotice || '';
  (ludo as any).rankings = currentGameState.rankings || [];
  (ludo as any).consecutiveSixes = currentGameState.consecutiveSixes || 0;
  (ludo as any).turnStartedAt = currentGameState.turnStartedAt || Date.now();
  (ludo as any).passAt = currentGameState.passAt ?? null;
  (ludo as any).stateVersion = currentGameState.stateVersion || 1;
}

export function processLudoAction(
  room: RoomInfo,
  currentGameState: any,
  playerId: string,
  actionData: any
): { gameState: any; results: any | null } {
  const ludo = new LudoGame();
  ludo.initialize(room.id, room.players, room.settings, dummyIo);
  restoreLudoState(ludo, currentGameState);

  // Handle actions
  if (actionData.action === 'pass-turn' || actionData.type === 'pass-turn') {
    ludo.passToNextPlayer();
  } else if (actionData.action === 'roll-dice' || actionData.type === 'roll') {
    ludo.handleInput(playerId, { action: 'roll-dice' });
  } else if (actionData.action === 'move-token') {
    ludo.handleInput(playerId, { action: 'move-token', tokenIndex: actionData.tokenIndex });
  } else if (actionData.type === 'select_token' || actionData.type === 'move') {
    ludo.handleInput(playerId, {
      action: 'move-token',
      tokenIndex: actionData.tokenIndex ?? actionData.tokenId ?? 0,
    });
  } else {
    ludo.handleInput(playerId, actionData);
  }

  const newGameState = ludo.getState();
  const results = ludo.isFinished() ? ludo.getResults() : null;

  return { gameState: newGameState, results };
}

export function checkLudoTimeout(
  room: RoomInfo,
  currentGameState: any
): { changed: boolean; gameState: any; results: any | null } {
  if (
    !currentGameState ||
    currentGameState.gameId !== 'ludo' ||
    currentGameState.status === 'finished'
  ) {
    return { changed: false, gameState: currentGameState, results: null };
  }

  const ludo = new LudoGame();
  ludo.initialize(room.id, room.players, room.settings, dummyIo);
  restoreLudoState(ludo, currentGameState);

  const changed = ludo.checkTimeouts(Date.now());
  if (changed) {
    const newGameState = ludo.getState();
    const results = ludo.isFinished() ? ludo.getResults() : null;
    return { changed: true, gameState: newGameState, results };
  }

  return { changed: false, gameState: currentGameState, results: null };
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

export function removeLudoPlayer(
  room: RoomInfo,
  currentGameState: any,
  targetPlayerId: string
): any {
  const ludo = new LudoGame();
  ludo.initialize(room.id, room.players, room.settings, dummyIo);
  restoreLudoState(ludo, currentGameState);
  ludo.removePlayer(targetPlayerId);
  return ludo.getState();
}

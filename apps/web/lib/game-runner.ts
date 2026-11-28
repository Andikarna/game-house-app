import { RoomInfo, Player } from '../shared';
import { LudoGame } from './games/ludo/LudoGame';
import { SnakeLadderGame } from './games/snake-ladder/SnakeLadderGame';
import { PanjatPinangGame } from './games/panjat-pinang/PanjatPinangGame';
import { UnoGame } from './games/uno/UnoGame';

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
  } else if (room.settings.gameId === 'snake-ladder') {
    const snake = new SnakeLadderGame();
    snake.initialize(room.id, room.players, room.settings, dummyIo);
    return snake.getState();
  } else if (room.settings.gameId === 'uno') {
    const uno = new UnoGame();
    uno.initialize(room.id, room.players, room.settings, dummyIo);
    return uno.getStateWithSecrets();
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
  (ludo as any).rolledAt = currentGameState.rolledAt ?? null;
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
    ludo.handleInput(playerId, { action: 'pass-turn' });
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
  ludo.cleanup();

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
    ludo.cleanup();
    return { changed: true, gameState: newGameState, results };
  }

  ludo.cleanup();
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

function restoreSnakeState(snake: SnakeLadderGame, currentGameState: any): void {
  if (!currentGameState) return;

  if (currentGameState.players) {
    Object.entries(currentGameState.players).forEach(([pId, pState]: [string, any]) => {
      (snake as any).players.set(pId, pState);
    });
  }

  if (Array.isArray(currentGameState.playerOrder) && currentGameState.playerOrder.length > 0) {
    (snake as any).playerOrder = currentGameState.playerOrder;
  }

  if (currentGameState.currentTurnPlayerId && (snake as any).playerOrder) {
    const idx = (snake as any).playerOrder.indexOf(currentGameState.currentTurnPlayerId);
    if (idx !== -1) {
      (snake as any).currentTurnIndex = idx;
    }
  }

  (snake as any).diceValue = currentGameState.diceValue ?? null;
  (snake as any).hasRolled = Boolean(currentGameState.hasRolled);
  (snake as any).winnerId = currentGameState.winnerId || null;
  (snake as any).finished = currentGameState.status === 'finished' || Boolean(currentGameState.winnerId);
  (snake as any).lastMove = currentGameState.lastMove || null;
  (snake as any).moveSeq = currentGameState.lastMove?.seq || 0;
  (snake as any).lastMoveNotice = currentGameState.lastMoveNotice || '';
  (snake as any).rankings = currentGameState.rankings || [];
  (snake as any).consecutiveSixes = currentGameState.consecutiveSixes || 0;
  (snake as any).turnStartedAt = currentGameState.turnStartedAt || Date.now();
  (snake as any).rolledAt = currentGameState.rolledAt ?? null;
  (snake as any).moveAnimUntil = currentGameState.moveAnimUntil ?? null;
  (snake as any).stateVersion = currentGameState.stateVersion || 1;
}

export function processSnakeAction(
  room: RoomInfo,
  currentGameState: any,
  playerId: string,
  actionData: any
): { gameState: any; results: any | null } {
  const snake = new SnakeLadderGame();
  snake.initialize(room.id, room.players, room.settings, dummyIo);
  restoreSnakeState(snake, currentGameState);

  if (actionData.action === 'roll-dice' || actionData.type === 'roll') {
    snake.handleInput(playerId, { action: 'roll-dice' });
  } else {
    snake.handleInput(playerId, actionData);
  }

  const newGameState = snake.getState();
  const results = snake.isFinished() ? snake.getResults() : null;
  snake.cleanup();
  return { gameState: newGameState, results };
}

export function checkSnakeTimeout(
  room: RoomInfo,
  currentGameState: any
): { changed: boolean; gameState: any; results: any | null } {
  if (
    !currentGameState ||
    currentGameState.gameId !== 'snake-ladder' ||
    currentGameState.status === 'finished'
  ) {
    return { changed: false, gameState: currentGameState, results: null };
  }

  const snake = new SnakeLadderGame();
  snake.initialize(room.id, room.players, room.settings, dummyIo);
  restoreSnakeState(snake, currentGameState);

  const changed = snake.checkTimeouts(Date.now());
  if (changed) {
    const newGameState = snake.getState();
    const results = snake.isFinished() ? snake.getResults() : null;
    snake.cleanup();
    return { changed: true, gameState: newGameState, results };
  }

  snake.cleanup();
  return { changed: false, gameState: currentGameState, results: null };
}

export function removeSnakePlayer(
  room: RoomInfo,
  currentGameState: any,
  targetPlayerId: string
): any {
  const snake = new SnakeLadderGame();
  snake.initialize(room.id, room.players, room.settings, dummyIo);
  restoreSnakeState(snake, currentGameState);
  snake.removePlayer(targetPlayerId);
  return snake.getState();
}

export function processUnoAction(
  room: RoomInfo,
  currentGameState: any,
  playerId: string,
  actionData: any
): { gameState: any; results: any | null } {
  const uno = new UnoGame();
  uno.initialize(room.id, room.players, room.settings, dummyIo);
  if (currentGameState) {
    uno.restoreState(currentGameState);
  }

  uno.handleInput(playerId, actionData);
  const newGameState = uno.getStateWithSecrets();
  const results = uno.isFinished() ? uno.getResults() : null;
  uno.cleanup();
  return { gameState: newGameState, results };
}

export function checkUnoTimeout(
  room: RoomInfo,
  currentGameState: any
): { changed: boolean; gameState: any; results: any | null } {
  if (
    !currentGameState ||
    currentGameState.gameId !== 'uno' ||
    currentGameState.status === 'finished'
  ) {
    return { changed: false, gameState: currentGameState, results: null };
  }

  const uno = new UnoGame();
  uno.initialize(room.id, room.players, room.settings, dummyIo);
  uno.restoreState(currentGameState);

  const changed = uno.checkTimeouts(Date.now());
  if (changed) {
    const newGameState = uno.getStateWithSecrets();
    const results = uno.isFinished() ? uno.getResults() : null;
    uno.cleanup();
    return { changed: true, gameState: newGameState, results };
  }

  uno.cleanup();
  return { changed: false, gameState: currentGameState, results: null };
}

export function removeUnoPlayer(
  room: RoomInfo,
  currentGameState: any,
  targetPlayerId: string
): any {
  const uno = new UnoGame();
  uno.initialize(room.id, room.players, room.settings, dummyIo);
  if (currentGameState) {
    uno.restoreState(currentGameState);
  }
  uno.removePlayer(targetPlayerId);
  const updated = uno.getStateWithSecrets();
  uno.cleanup();
  return updated;
}

export function sanitizeUnoForClient(gameState: any, playerId?: string | null): any {
  return UnoGame.sanitizeStateForPlayer(gameState, playerId);
}

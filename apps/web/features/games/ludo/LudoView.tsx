'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { LudoGameState } from '@gamehouse/shared';
import { LudoBoard } from './LudoBoard';
import { LudoDice } from './LudoDice';
import { LudoTurnHUD } from './LudoTurnHUD';
import { LudoResultModal } from './LudoResultModal';
import { LudoChatBox } from './LudoChatBox';
import { VoteKickModal, ActiveVoteKickBanner } from './VoteKickModal';
import { EmotePicker } from '../../../components/emotes/EmotePicker';
import { FloatingEmoteLayer } from '../../../components/emotes/FloatingEmoteLayer';
import { soundManager } from '../../../components/audio/SoundManager';
import { MusicControl } from '../../../components/audio/MusicControl';
import { getGlobalSocket } from '../../../hooks/useSocket';
import { LogOut, Dices, UserMinus } from 'lucide-react';
import Link from 'next/link';

export const LudoView: React.FC = () => {
  const {
    socket,
    room,
    playerId,
    gameState,
    gameResults,
    setGameState,
    setGameResults,
    addToast,
  } = useGameStore();

  const isHost = room?.hostId === playerId;
  const [isVoteKickModalOpen, setIsVoteKickModalOpen] = useState(false);

  // Tracking refs to detect dice roll and token captures for sound effects
  const prevDiceRef = useRef<number | null>(null);
  const prevTokensStateRef = useRef<Record<string, Record<number, { state: string; stepCount: number }>>>({});
  const isFirstRender = useRef(true);
  const lastProcessedCaptureNoticeRef = useRef<string>('');
  const lastProcessedFinishNoticeRef = useRef<string>('');

  // Auto-play playful Marimba BGM during Ludo match
  useEffect(() => {
    soundManager.playLudoBGM();
  }, []);

  // Reactive Sound Effects for Dice Roll and Synchronized Toasts
  useEffect(() => {
    if (!gameState || gameState.gameId !== 'ludo') return;
    const ludo = gameState as LudoGameState;

    // 1. Dice Roll Sound: Trigger when dice value is newly rolled
    if (ludo.diceValue !== null && ludo.diceValue !== prevDiceRef.current) {
      soundManager.playDiceRoll();
      prevDiceRef.current = ludo.diceValue;

      // Helpful notice if no valid moves (e.g. rolled < 6 while all in base)
      if (ludo.validMoves.length === 0 && ludo.currentTurnPlayerId === playerId) {
        const myP = ludo.players[playerId];
        const allInBaseOrDone = myP?.tokens.every((t) => t.state === 'base' || t.state === 'finished');
        if (allInBaseOrDone) {
          addToast(`🎲 Dadu ${ludo.diceValue}: Butuh angka 6 untuk keluar dari markas!`, 'info');
        } else {
          addToast(`🎲 Dadu ${ludo.diceValue}: Tidak ada langkah yang valid.`, 'info');
        }
      }
    } else if (ludo.diceValue === null) {
      prevDiceRef.current = null;
    }

    // 2. Token Capture Toast: Authoritative check synchronized with the walking arrival
    if (!isFirstRender.current) {
      if (
        ludo.lastMoveNotice &&
        ludo.lastMoveNotice.includes('memulangkan bidak') &&
        ludo.lastMoveNotice !== lastProcessedCaptureNoticeRef.current
      ) {
        lastProcessedCaptureNoticeRef.current = ludo.lastMoveNotice;
        let walkSteps = 0;
        // Check if any token is walking forward to capture
        Object.values(ludo.players).forEach((p) => {
          p.tokens.forEach((t) => {
            const prev = prevTokensStateRef.current[p.playerId]?.[t.id];
            if (prev && t.state !== 'base' && t.stepCount > prev.stepCount) {
              walkSteps = Math.max(walkSteps, t.stepCount - prev.stepCount);
            }
          });
        });

        const delay = walkSteps * 105;
        const captureNotice = ludo.lastMoveNotice;
        setTimeout(() => {
          addToast(captureNotice, 'warning');
        }, delay);
      }

      // 3. Token Finish Toast
      if (
        ludo.lastMoveNotice &&
        ludo.lastMoveNotice.includes('memasukkan bidak ke HOME') &&
        ludo.lastMoveNotice !== lastProcessedFinishNoticeRef.current
      ) {
        lastProcessedFinishNoticeRef.current = ludo.lastMoveNotice;
        addToast(ludo.lastMoveNotice, 'success');
      }
    } else {
      isFirstRender.current = false;
    }

    // Update tokens cache
    const currentTokensMap: Record<string, Record<number, { state: string; stepCount: number }>> = {};
    Object.values(ludo.players).forEach((p) => {
      currentTokensMap[p.playerId] = {};
      p.tokens.forEach((t) => {
        currentTokensMap[p.playerId][t.id] = { state: t.state, stepCount: t.stepCount };
      });
    });
    prevTokensStateRef.current = currentTokensMap;
  }, [gameState, addToast]);

  // Auto-pass turn if current player rolled a number with no valid moves
  useEffect(() => {
    if (!gameState || gameState.gameId !== 'ludo') return;
    const ludo = gameState as LudoGameState;

    if (
      ludo.currentTurnPlayerId === playerId &&
      ludo.hasRolled &&
      ludo.validMoves &&
      ludo.validMoves.length === 0 &&
      ludo.status !== 'finished'
    ) {
      const activeSocket = socket || getGlobalSocket();
      const timer = setTimeout(() => {
        if (activeSocket) {
          activeSocket.emit('game:input', { action: 'pass-turn' });
        }
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [gameState, playerId, socket]);

  const activeSocket = socket || getGlobalSocket();

  const handleRollDice = () => {
    if (activeSocket) {
      activeSocket.emit('game:input', { action: 'roll-dice' });
    }
  };

  const handleSelectToken = (tokenIndex: number) => {
    if (!activeSocket) return;

    if (gameState && gameState.gameId === 'ludo') {
      const ludo = gameState as LudoGameState;
      const myP = ludo.players[playerId];
      const dice = ludo.diceValue;

      if (
        ludo.currentTurnPlayerId === playerId &&
        ludo.hasRolled &&
        dice !== null &&
        ludo.validMoves?.includes(tokenIndex) &&
        myP
      ) {
        const token = myP.tokens[tokenIndex];
        if (token) {
          const nextStep = token.state === 'base' && dice === 6 ? 1 : token.stepCount + dice;
          const nextState =
            nextStep <= 77
              ? 'track'
              : nextStep <= 82
              ? 'home-stretch'
              : 'finished';

          const updatedTokens = myP.tokens.map((t, idx) =>
            idx === tokenIndex
              ? {
                  ...t,
                  state: nextState as typeof t.state,
                  stepCount: Math.min(83, nextStep),
                }
              : t
          );

          // Optimistically start token hop immediately without waiting for network RTT
          setGameState({
            ...ludo,
            validMoves: [],
            hasRolled: false,
            diceValue: null,
            players: {
              ...ludo.players,
              [playerId]: {
                ...myP,
                tokens: updatedTokens,
                canRoll: false,
                hasRolled: false,
              },
            },
          });
        }
      }
    }

    activeSocket.emit('game:input', { action: 'move-token', tokenIndex });
  };

  const handlePlayAgain = () => {
    if (activeSocket && isHost) {
      activeSocket.emit('game:restart');
      setGameResults(null);
    }
  };

  const handleLeaveRoom = () => {
    if (activeSocket) {
      activeSocket.emit('room:leave');
      window.location.href = '/';
    }
  };

  if (!gameState || gameState.gameId !== 'ludo') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400 gap-3">
        <Dices className="w-10 h-10 text-indigo-400 animate-spin" />
        <span className="font-bold text-sm">Menyiapkan Meja Ludo Party...</span>
      </div>
    );
  }

  const ludoState = gameState as LudoGameState;
  const isMyTurn = ludoState.currentTurnPlayerId === playerId;
  const myPlayer = ludoState.players[playerId];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between p-2 sm:p-4 pb-6 overflow-x-hidden relative select-none">
      {/* Dynamic Background Ambient Light */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* ================= 1. TOP HEADER ================= */}
      <header className="w-full max-w-xl flex items-center justify-between px-3 py-2 rounded-2xl bg-surface/85 backdrop-blur-md border border-slate-700/60 shadow-lg z-20 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🎲</span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white leading-tight">Ludo Party</h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Room: <strong className="text-amber-400 font-black">{room?.code}</strong> •{' '}
              {ludoState.gameMode === 'quick' ? 'Quick (2 Win)' : 'Classic (4 Win)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Vote Kick AFK Button (Visible when players > 2) */}
          {ludoState.playerOrder.length > 2 && (
            <button
              type="button"
              onClick={() => setIsVoteKickModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-surface-elevated border border-slate-700/60 text-slate-300 hover:text-rose-400 hover:border-rose-500/50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Ajukan Vote Kick untuk pemain yang AFK"
            >
              <UserMinus className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-300 hidden sm:inline">Vote Kick</span>
            </button>
          )}

          {/* Music Track Switcher & Mute */}
          <MusicControl compact />

          {/* Leave Button */}
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="p-2 rounded-xl bg-surface-elevated border border-slate-700/60 text-slate-400 hover:text-white active:scale-95 transition-all cursor-pointer"
            title="Keluar Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ================= 1b. ACTIVE VOTE KICK LIVE BANNER ================= */}
      <ActiveVoteKickBanner />

      {/* ================= 2. ACTIVE TURN HUD ================= */}
      <div className="w-full max-w-xl z-20 mb-2">
        <LudoTurnHUD
          gameState={ludoState}
          myPlayerId={playerId}
          onTriggerVoteKick={(targetId) => {
            if (activeSocket) {
              activeSocket.emit('game:vote-kick-start', { targetPlayerId: targetId });
            }
          }}
        />
      </div>

      {/* ================= 3. THE 15x15 LUDO BOARD ================= */}
      <main className="w-full flex-1 flex items-center justify-center z-10 py-1">
        <LudoBoard
          gameState={ludoState}
          myPlayerId={playerId}
          onSelectToken={handleSelectToken}
        />
      </main>

      {/* ================= 4. BOTTOM DICE CONTROLS ================= */}
      <footer className="w-full max-w-xl flex flex-col items-center justify-center pt-2 z-20">
        <LudoDice
          value={ludoState.diceValue}
          canRoll={Boolean(myPlayer?.canRoll)}
          isMyTurn={isMyTurn}
          onRoll={handleRollDice}
          validMovesLength={ludoState.validMoves?.length}
        />
      </footer>

      {/* Floating Animated Emote Broadcast Layer */}
      <FloatingEmoteLayer />

      {/* Floating Emote Trigger & Drawer */}
      <EmotePicker buttonPosition="bottom-right" />

      {/* Floating Free Chat Trigger & Drawer */}
      <LudoChatBox />

      {/* Vote Kick Selection Modal */}
      <VoteKickModal
        isOpen={isVoteKickModalOpen}
        onClose={() => setIsVoteKickModalOpen(false)}
        gameState={ludoState}
      />

      {/* ================= 5. RESULT MODAL ================= */}
      {gameResults && (
        <LudoResultModal
          results={gameResults}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
};

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { SnakeLadderGameState } from '@gamehouse/shared';
import { SnakeLadderBoard25D } from './SnakeLadderBoard25D';
import { SnakeLadderDice } from './SnakeLadderDice';
import { SnakeLadderTurnHUD } from './SnakeLadderTurnHUD';
import { SnakeLadderResultModal } from './SnakeLadderResultModal';
import { LudoChatBox } from '../ludo/LudoChatBox';
import { VoteKickModal, ActiveVoteKickBanner } from '../ludo/VoteKickModal';
import { EmotePicker } from '../../../components/emotes/EmotePicker';
import { FloatingEmoteLayer } from '../../../components/emotes/FloatingEmoteLayer';
import { soundManager } from '../../../components/audio/SoundManager';
import { MusicControl } from '../../../components/audio/MusicControl';
import { getGlobalSocket } from '../../../hooks/useSocket';
import { LogOut, Dices, UserMinus, Box, Square } from 'lucide-react';

export const SnakeLadderView: React.FC = () => {
  const {
    socket,
    room,
    playerId,
    gameState,
    gameResults,
    setGameResults,
    addToast,
  } = useGameStore();

  const isHost = room?.hostId === playerId;
  const [isVoteKickModalOpen, setIsVoteKickModalOpen] = useState(false);
  const [is25D, setIs25D] = useState(true);
  const [isAnimatingBoard, setIsAnimatingBoard] = useState(false);

  const lastNotifiedSeqRef = useRef<number>(0);

  useEffect(() => {
    soundManager.playSnakeLadderBGM();
  }, []);

  // Synchronized Toast announcements for ladder climbs, snake bites, and bounce-backs
  useEffect(() => {
    if (!gameState || gameState.gameId !== 'snake-ladder') return;
    const snakeState = gameState as SnakeLadderGameState;
    const move = snakeState.lastMove;
    if (!move || move.seq <= lastNotifiedSeqRef.current) return;
    lastNotifiedSeqRef.current = move.seq;

    const moverName = snakeState.players[move.playerId]?.nickname || 'Pemain';
    const walkDelay = move.walkPath.length * 165 + 120;

    if (move.trigger?.type === 'ladder') {
      const trig = move.trigger;
      setTimeout(() => {
        addToast(`🪜 ${moverName} naik ${trig.name} (${trig.from} → ${trig.to})!`, 'success');
      }, walkDelay);
    } else if (move.trigger?.type === 'snake') {
      const trig = move.trigger;
      setTimeout(() => {
        addToast(`🐍 ${moverName} digigit ${trig.name} (${trig.from} → ${trig.to})!`, 'warning');
      }, walkDelay);
    } else if (move.bouncedAt100) {
      setTimeout(() => {
        addToast(`💥 ${moverName} memantul dari petak 100 ke ${move.toTile}!`, 'info');
      }, walkDelay);
    }
  }, [gameState, addToast]);

  const activeSocket = socket || getGlobalSocket();

  const handleRollDice = () => {
    if (activeSocket) {
      activeSocket.emit('game:input', { action: 'roll-dice' });
    }
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

  if (!gameState || gameState.gameId !== 'snake-ladder') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400 gap-3">
        <Dices className="w-10 h-10 text-emerald-400 animate-spin" />
        <span className="font-bold text-sm">Menyiapkan Papan Ular Tangga 2.5D...</span>
      </div>
    );
  }

  const snakeState = gameState as SnakeLadderGameState;
  const isMyTurn = snakeState.currentTurnPlayerId === playerId;
  const myPlayer = snakeState.players[playerId];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between p-2 sm:p-4 pb-6 overflow-x-hidden relative select-none">
      {/* Ambient Tropical Glow */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-600/12 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER */}
      <header className="w-full max-w-2xl flex items-center justify-between px-3 py-2 rounded-2xl bg-surface/85 backdrop-blur-md border border-slate-700/60 shadow-lg z-20 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">🐍</span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
              Ular Tangga 2.5D
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Room: <strong className="text-amber-400 font-black">{room?.code}</strong> •{' '}
              {snakeState.gameMode === 'snake-quick' ? 'Quick' : 'Classic'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 2.5D Perspective Toggle */}
          <button
            type="button"
            onClick={() => setIs25D((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-black transition-colors cursor-pointer"
            title={is25D ? 'Ubah ke Tampilan Datar (2D)' : 'Ubah ke Tampilan 2.5D'}
          >
            {is25D ? <Box className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{is25D ? '2.5D' : '2D'}</span>
          </button>

          {snakeState.playerOrder.length > 2 && (
            <button
              type="button"
              onClick={() => setIsVoteKickModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-black transition-colors cursor-pointer"
              title="Vote Kick pemain yang AFK"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kick</span>
            </button>
          )}

          <MusicControl compact />

          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-rose-600/20 border border-slate-700 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Active Vote Kick Banner */}
      <ActiveVoteKickBanner />

      {/* 2. TURN HUD */}
      <div className="w-full flex justify-center z-20 mb-2">
        <SnakeLadderTurnHUD
          gameState={snakeState}
          myPlayerId={playerId}
          onTriggerVoteKick={() => setIsVoteKickModalOpen(true)}
        />
      </div>

      {/* 3. 2.5D GAME BOARD */}
      <div className="w-full flex items-center justify-center z-10 my-1 px-1 sm:px-4">
        <SnakeLadderBoard25D
          gameState={snakeState}
          myPlayerId={playerId}
          is25D={is25D}
          onAnimationBusyChange={setIsAnimatingBoard}
        />
      </div>

      {/* 4. 3D DICE & QUICK LEGEND */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-2 z-20 mt-1">
        <SnakeLadderDice
          value={snakeState.diceValue}
          moveSeq={snakeState.lastMove?.seq || 0}
          canRoll={Boolean(myPlayer?.canRoll) && snakeState.status !== 'finished'}
          isMyTurn={isMyTurn}
          isAnimatingBoard={isAnimatingBoard}
          onRoll={handleRollDice}
        />

        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-xs text-slate-400 px-3">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 font-bold">
            🪜 7 Tangga Naik
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 font-bold">
            🐍 8 Ular 2.5D Aktif
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-bold">
            {snakeState.gameMode === 'snake-quick'
              ? '⚡ Mode Cepat: >= 100 Menang'
              : '🎯 Mode Klasik: Tepat 100 (Pantul)'}
          </span>
        </div>
      </div>

      {/* 5. FLOATING EMOTES & CHAT */}
      <FloatingEmoteLayer />
      <LudoChatBox />

      <div className="fixed bottom-4 left-4 z-30">
        <EmotePicker />
      </div>

      {/* 6. MODALS */}
      <VoteKickModal
        isOpen={isVoteKickModalOpen}
        onClose={() => setIsVoteKickModalOpen(false)}
        gameState={snakeState}
      />

      {gameResults && (
        <SnakeLadderResultModal
          results={gameResults}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
};

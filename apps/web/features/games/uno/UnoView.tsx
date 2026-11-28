'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../../stores/useGameStore';
import {
  UnoGameState,
  UnoCard as UnoCardType,
  UnoColor,
  UnoPlayerPublic,
  UNO_COLOR_META,
} from '@gamehouse/shared';
import { UnoTableRing } from './UnoTableRing';
import { UnoCenterPile } from './UnoCenterPile';
import { UnoPlayerHand } from './UnoPlayerHand';
import { UnoFxOverlay } from './UnoFxOverlay';
import { UnoColorPickerModal } from './UnoColorPickerModal';
import { UnoSwapTargetModal } from './UnoSwapTargetModal';
import { UnoResultModal } from './UnoResultModal';
import { UnoLeaderboardModal } from './UnoLeaderboardModal';
import { LudoChatBox } from '../ludo/LudoChatBox';
import { VoteKickModal, ActiveVoteKickBanner } from '../ludo/VoteKickModal';
import { EmotePicker } from '../../../components/emotes/EmotePicker';
import { FloatingEmoteLayer } from '../../../components/emotes/FloatingEmoteLayer';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { soundManager } from '../../../components/audio/SoundManager';
import { MusicControl } from '../../../components/audio/MusicControl';
import { getGlobalSocket } from '../../../hooks/useSocket';
import { LogOut, UserMinus, Trophy, Wifi, Zap, Layers } from 'lucide-react';

export const UnoView: React.FC = () => {
  const {
    socket,
    room,
    playerId,
    gameState,
    gameResults,
    ping,
    transportMode,
    setGameResults,
    addToast,
  } = useGameStore();

  const isHost = room?.hostId === playerId;
  const activeSocket = socket || getGlobalSocket();

  const [isVoteKickModalOpen, setIsVoteKickModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCardType | null>(null);
  const [pendingSwapCard, setPendingSwapCard] = useState<UnoCardType | null>(null);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(20);

  // 0ms Optimistic Card Prediction state
  const [optimisticMove, setOptimisticMove] = useState<{
    cardId: string;
    card: UnoCardType;
    color: UnoColor;
    baseVersion: number;
  } | null>(null);

  const lastFxSeqRef = useRef<number>(0);

  useEffect(() => {
    soundManager.playUnoBGM();
  }, []);

  const unoState = gameState && gameState.gameId === 'uno' ? (gameState as UnoGameState) : null;

  // Clear optimistic overlay when authoritative stateVersion advances or after 1.8s fallback
  useEffect(() => {
    if (!unoState || !optimisticMove) return;
    if ((unoState.stateVersion || 0) > optimisticMove.baseVersion) {
      setOptimisticMove(null);
      return;
    }
    const timer = setTimeout(() => setOptimisticMove(null), 1800);
    return () => clearTimeout(timer);
  }, [unoState, optimisticMove]);

  // Smooth local countdown clock aligned with turnStartedAt
  useEffect(() => {
    if (!unoState || unoState.status === 'finished') return;
    const syncClock = () => {
      const elapsed = (Date.now() - (unoState.turnStartedAt || Date.now())) / 1000;
      const left = Math.max(0, (unoState.turnDurationSeconds || 20) - elapsed);
      setTurnTimeLeft(left);
    };
    syncClock();
    const id = setInterval(syncClock, 250);
    return () => clearInterval(id);
  }, [unoState?.turnStartedAt, unoState?.turnDurationSeconds, unoState?.status, unoState?.stateVersion]);

  // Trigger audio + micro-shake on new UNO FX events
  useEffect(() => {
    if (!unoState?.lastFx || unoState.lastFx.seq <= lastFxSeqRef.current) return;
    lastFxSeqRef.current = unoState.lastFx.seq;
    const fx = unoState.lastFx;

    if (fx.type === 'play') {
      soundManager.playCardFlick();
    } else if (fx.type === 'draw') {
      soundManager.playCardDraw();
    } else if (fx.type === 'uno') {
      soundManager.playUnoShout();
    } else if (fx.type === 'catch') {
      soundManager.playUnoCatch();
      setShakeTrigger((s) => s + 1);
    } else if (
      fx.type === 'skip' ||
      fx.type === 'reverse' ||
      fx.type === 'draw2' ||
      fx.type === 'wild' ||
      fx.type === 'wild_draw4' ||
      fx.type === 'swap' ||
      fx.type === 'rotate'
    ) {
      soundManager.playUnoAction(fx.type);
      if (fx.type === 'draw2' || fx.type === 'wild_draw4') {
        setShakeTrigger((s) => s + 1);
      }
    }

    if (fx.type === 'catch' || fx.type === 'swap' || fx.type === 'rotate') {
      addToast(fx.message, fx.type === 'catch' ? 'warning' : 'info');
    }
  }, [unoState?.lastFx, addToast]);

  const emitUnoInput = useCallback(
    (payload: any) => {
      if (activeSocket) {
        activeSocket.emit('game:input', payload);
      }
    },
    [activeSocket]
  );

  const commitPlayCard = useCallback(
    (card: UnoCardType, chosenColor?: UnoColor, targetPlayerId?: string) => {
      if (!unoState) return;
      const resolvedColor: UnoColor =
        chosenColor || (card.color === 'wild' ? unoState.activeColor : card.color);

      // Instant 0ms local visual projection
      soundManager.playCardFlick();
      setOptimisticMove({
        cardId: card.id,
        card,
        color: resolvedColor,
        baseVersion: unoState.stateVersion || 0,
      });

      emitUnoInput({
        action: 'play-card',
        cardId: card.id,
        chosenColor: card.color === 'wild' ? resolvedColor : undefined,
        targetPlayerId,
      });
    },
    [unoState, emitUnoInput]
  );

  const handleCardClick = useCallback(
    (card: UnoCardType) => {
      if (!unoState) return;
      if (card.color === 'wild') {
        setPendingWildCard(card);
        return;
      }
      if (unoState.gameMode === 'uno-chaos' && card.value === '7') {
        setPendingSwapCard(card);
        return;
      }
      commitPlayCard(card);
    },
    [unoState, commitPlayCard]
  );

  const handleDrawCard = useCallback(() => {
    soundManager.playCardDraw();
    emitUnoInput({ action: 'draw-card' });
  }, [emitUnoInput]);

  const handlePassTurn = useCallback(() => {
    emitUnoInput({ action: 'pass-turn' });
  }, [emitUnoInput]);

  const handleCallUno = useCallback(() => {
    soundManager.playUnoShout();
    emitUnoInput({ action: 'call-uno' });
  }, [emitUnoInput]);

  const handleCatchUno = useCallback(
    (targetPlayerId: string) => {
      soundManager.playUnoCatch();
      emitUnoInput({ action: 'catch-uno', targetPlayerId });
    },
    [emitUnoInput]
  );

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

  // Keyboard shortcuts: Space (Draw/Pass), U (UNO!)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!unoState || unoState.status === 'finished') return;
      const isMyTurn = unoState.currentTurnPlayerId === playerId && !optimisticMove;
      if (e.code === 'Space' && isMyTurn) {
        e.preventDefault();
        if (unoState.drawnPlayableCardId) {
          handlePassTurn();
        } else {
          handleDrawCard();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        handleCallUno();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [unoState, playerId, optimisticMove, handleDrawCard, handlePassTurn, handleCallUno]);

  // Order opponents clockwise starting immediately after the local player
  const opponentsOrdered = useMemo<UnoPlayerPublic[]>(() => {
    if (!unoState) return [];
    const order = unoState.playerOrder || [];
    const myIdx = order.indexOf(playerId);
    const orderedIds =
      myIdx >= 0 ? [...order.slice(myIdx + 1), ...order.slice(0, myIdx)] : order;
    return orderedIds
      .map((id) => unoState.players[id])
      .filter((p): p is UnoPlayerPublic => Boolean(p));
  }, [unoState, playerId]);

  if (!unoState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-300 gap-3">
        <Layers className="w-10 h-10 text-indigo-400 animate-bounce" />
        <span className="font-black text-sm">Menyiapkan Meja UNO Party...</span>
      </div>
    );
  }

  const myPlayer = unoState.players[playerId];
  const isMyTurn = unoState.currentTurnPlayerId === playerId && !optimisticMove;
  const displayedActiveColor: UnoColor = optimisticMove?.color || unoState.activeColor || 'red';
  const displayedTopCard = optimisticMove?.card || unoState.topCard;
  const displayedHand = optimisticMove
    ? (unoState.myHand || []).filter((c) => c.id !== optimisticMove.cardId)
    : unoState.myHand || [];
  const displayedPlayableIds = optimisticMove ? [] : unoState.playableCardIds || [];

  const colorMeta = UNO_COLOR_META[displayedActiveColor] || UNO_COLOR_META.blue;
  const currentTurnPlayer = unoState.players[unoState.currentTurnPlayerId];
  const canDraw = isMyTurn && !unoState.drawnPlayableCardId;

  const modeBadgeLabel =
    unoState.gameMode === 'uno-chaos'
      ? 'Chaos 7-0'
      : unoState.gameMode === 'uno-stack'
      ? 'Turbo Stack'
      : 'Classic';

  const transportLabel =
    transportMode === 'websocket'
      ? 'WebSocket'
      : transportMode === 'supabase-realtime'
      ? 'Supabase RT'
      : 'Sync';

  return (
    <motion.div
      animate={shakeTrigger > 0 ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
      transition={{ duration: 0.35 }}
      key={shakeTrigger > 0 ? `shake-${Math.floor(shakeTrigger / 9999)}` : 'uno-arena'}
      className="min-h-screen w-full bg-[#06241B] text-white flex flex-col justify-between p-2 sm:p-4 pb-4 overflow-x-hidden relative select-none"
    >
      {/* Original UNO Emerald Casino Felt Tabletop & Mahogany Side Rails */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 78% 70% at 50% 48%, #0E4D38 0%, #093325 52%, #041812 100%)',
        }}
      />
      {/* Left & Right Dark Table Border Rails */}
      <div className="fixed inset-y-0 left-0 w-3 sm:w-8 bg-gradient-to-r from-[#070B14] via-[#0B1220]/90 to-transparent pointer-events-none" />
      <div className="fixed inset-y-0 right-0 w-3 sm:w-8 bg-gradient-to-l from-[#070B14] via-[#0B1220]/90 to-transparent pointer-events-none" />
      {/* Dynamic Ambient Color Aura matching Active UNO Color */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[360px] rounded-full blur-[130px] opacity-25 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: colorMeta.hex }}
      />

      {/* 1. TOP ARENA HEADER */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between px-3 py-2 rounded-2xl bg-surface/85 backdrop-blur-md border border-slate-700/60 shadow-lg z-30 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {myPlayer && <ClimberAvatarIcon avatar={myPlayer.avatar} size={32} shape="circle" />}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-black text-white truncate">
                UNO Party
              </h3>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 uppercase">
                {modeBadgeLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              Room <strong className="text-amber-400 font-black">{room?.code}</strong> • {unoState.playerOrder.length} Pemain
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Latency & Transport Pill */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-[10px] sm:text-[11px] font-black text-emerald-300"
            title="Live Network Latency"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>{ping > 0 ? `${ping}ms` : 'Live'}</span>
            <span className="hidden md:inline text-emerald-200/80 font-bold">• {transportLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-[11px] font-black transition-colors cursor-pointer"
            title="Leaderboard Global Supabase"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rank</span>
          </button>

          {unoState.playerOrder.length > 2 && (
            <button
              type="button"
              onClick={() => setIsVoteKickModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-black transition-colors cursor-pointer"
              title="Vote Kick pemain AFK"
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

      <ActiveVoteKickBanner />

      {/* 2. OPPONENTS TABLE RING (3 to 9 opponents around table) */}
      <UnoTableRing
        opponentsOrdered={opponentsOrdered}
        currentTurnPlayerId={unoState.currentTurnPlayerId}
        activeColor={displayedActiveColor}
        turnTimeLeft={turnTimeLeft}
        turnDurationSeconds={unoState.turnDurationSeconds || 20}
        lastFxActorId={unoState.lastFx?.actorId}
        lastFxTargetId={unoState.lastFx?.targetId}
        lastFxType={unoState.lastFx?.type}
        onCatchUno={handleCatchUno}
      />

      {/* 3. CENTRAL DECK, DIRECTION ORBIT & DISCARD STACK */}
      <div className="flex flex-col items-center justify-center flex-1 my-1">
        <UnoCenterPile
          topCard={displayedTopCard}
          recentDiscards={unoState.recentDiscards || [displayedTopCard]}
          activeColor={displayedActiveColor}
          direction={unoState.direction}
          drawPileCount={unoState.drawPileCount}
          pendingDrawCount={unoState.pendingDrawCount}
          isMyTurn={isMyTurn}
          canDraw={canDraw}
          currentTurnNickname={currentTurnPlayer?.nickname || 'Pemain'}
          turnTimeLeft={turnTimeLeft}
          onDrawClick={handleDrawCard}
        />

        {/* Subtle live action ticker */}
        {unoState.lastMoveNotice && (
          <div className="mt-1 px-3.5 py-1 rounded-full bg-surface/80 border border-slate-800/90 text-[11px] font-semibold text-slate-300 max-w-md truncate text-center shadow">
            {unoState.lastMoveNotice}
          </div>
        )}
      </div>

      {/* 4. LOCAL PLAYER HAND & CONTROLS */}
      <UnoPlayerHand
        myPlayer={myPlayer}
        hand={displayedHand}
        playableCardIds={displayedPlayableIds}
        isMyTurn={isMyTurn}
        pendingDrawCount={unoState.pendingDrawCount}
        drawnPlayableCardId={unoState.drawnPlayableCardId}
        onPlayCard={handleCardClick}
        onDrawCard={handleDrawCard}
        onPassTurn={handlePassTurn}
        onCallUno={handleCallUno}
      />

      {/* 5. VFX PARTICLES & BANNERS */}
      <UnoFxOverlay lastFx={unoState.lastFx} />

      {/* 6. FLOATING EMOTES & CHAT */}
      <FloatingEmoteLayer />
      <LudoChatBox />
      <div className="fixed bottom-4 left-4 z-30">
        <EmotePicker />
      </div>

      {/* 7. MODALS */}
      <UnoColorPickerModal
        isOpen={Boolean(pendingWildCard)}
        isWildDraw4={pendingWildCard?.value === 'wild_draw4'}
        onSelectColor={(chosenColor) => {
          if (pendingWildCard) {
            commitPlayCard(pendingWildCard, chosenColor);
          }
          setPendingWildCard(null);
        }}
        onCancel={() => setPendingWildCard(null)}
      />

      <UnoSwapTargetModal
        isOpen={Boolean(pendingSwapCard)}
        opponents={opponentsOrdered}
        onSelectTarget={(targetId) => {
          if (pendingSwapCard) {
            commitPlayCard(pendingSwapCard, undefined, targetId);
          }
          setPendingSwapCard(null);
        }}
        onCancel={() => setPendingSwapCard(null)}
      />

      <UnoLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <VoteKickModal
        isOpen={isVoteKickModalOpen}
        onClose={() => setIsVoteKickModalOpen(false)}
        gameState={unoState}
      />

      {gameResults && (
        <UnoResultModal
          results={gameResults}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
          onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        />
      )}
    </motion.div>
  );
};

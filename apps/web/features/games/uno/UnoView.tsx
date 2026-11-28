'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { UnoAnimationLayer, CardFlightEvent, ComboCardBanner } from './UnoAnimationLayer';
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
import { LogOut, UserMinus, Trophy, Zap, Layers, Star } from 'lucide-react';

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

  // Optimistic card prediction
  const [optimisticMove, setOptimisticMove] = useState<{
    cardId: string;
    card: UnoCardType;
    color: UnoColor;
    baseVersion: number;
  } | null>(null);

  // Card Flight Animations & Combo Stacking
  const [cardFlights, setCardFlights] = useState<CardFlightEvent[]>([]);
  const [comboBanner, setComboBanner] = useState<ComboCardBanner | null>(null);
  const prevHandCountRef = useRef<number>(0);
  const prevTopCardIdRef = useRef<string>('');
  const lastFxSeqRef = useRef<number>(0);
  const lastLocalDrawAtRef = useRef<number>(0);

  useEffect(() => {
    soundManager.playUnoBGM();
  }, []);

  const unoState = gameState && gameState.gameId === 'uno' ? (gameState as UnoGameState) : null;

  // Clear optimistic overlay when server confirms
  useEffect(() => {
    if (!unoState || !optimisticMove) return;
    if ((unoState.stateVersion || 0) > optimisticMove.baseVersion) {
      setOptimisticMove(null);
      return;
    }
    const timer = setTimeout(() => setOptimisticMove(null), 2500);
    return () => clearTimeout(timer);
  }, [unoState?.stateVersion, optimisticMove]);

  // Card Flight on Draw (Detect hand increase)
  useEffect(() => {
    if (!unoState) return;
    const currentHandCount = unoState.myHand?.length || 0;
    if (prevHandCountRef.current > 0 && currentHandCount > prevHandCountRef.current) {
      const drawnCount = currentHandCount - prevHandCountRef.current;
      const recentlyDrewLocally = Date.now() - lastLocalDrawAtRef.current < 2500;
      // Skip duplicate flight if we already triggered an instant local draw for 1 card
      const startIndex = recentlyDrewLocally && drawnCount === 1 ? 1 : 0;
      const newFlights: CardFlightEvent[] = [];
      for (let i = startIndex; i < Math.min(drawnCount, 4); i++) {
        newFlights.push({
          id: `draw-${Date.now()}-${i}`,
          from: 'deck',
          to: 'hand',
          duration: 0.34 + i * 0.06,
          isFaceDown: true,
        });
      }
      if (newFlights.length > 0) {
        setCardFlights((prev) => [...prev, ...newFlights]);
      }
    }
    prevHandCountRef.current = currentHandCount;
  }, [unoState?.myHand?.length]);

  // Card Flight when opponent draws or discards
  useEffect(() => {
    if (!unoState?.topCard) return;
    const currentTopId = unoState.topCard.id;
    if (prevTopCardIdRef.current && prevTopCardIdRef.current !== currentTopId) {
      // Someone played a card to center!
      const actorId = unoState.lastFx?.actorId;
      const isMe = actorId === playerId;
      if (!isMe) {
        // If actorId is provided, flight originates from that specific player's pod!
        setCardFlights((prev) => [
          ...prev,
          {
            id: `play-${currentTopId}-${Date.now()}`,
            card: unoState.topCard,
            from: actorId || 'opponent',
            to: 'center',
            duration: 0.42,
            isFaceDown: false,
          },
        ]);
      }
    }
    prevTopCardIdRef.current = currentTopId;
  }, [unoState?.topCard, unoState?.lastFx?.actorId, playerId]);

  // Smooth local countdown
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

  // Audio + shake on FX events
  useEffect(() => {
    if (!unoState?.lastFx || unoState.lastFx.seq <= lastFxSeqRef.current) return;
    lastFxSeqRef.current = unoState.lastFx.seq;
    const fx = unoState.lastFx;

    if (fx.type === 'play') soundManager.playCardFlick();
    else if (fx.type === 'draw') soundManager.playCardDraw();
    else if (fx.type === 'uno') soundManager.playUnoShout();
    else if (fx.type === 'catch') {
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
      if (fx.type === 'draw2' || fx.type === 'wild_draw4') setShakeTrigger((s) => s + 1);
    }

    // Trigger COMBO banners for action chains / heavy plays
    if (fx.type === 'draw2' || fx.type === 'wild_draw4') {
      const count = fx.drawCount || (fx.type === 'draw2' ? 2 : 4);
      setComboBanner({
        id: `combo-${Date.now()}`,
        type: 'draw_chain',
        title: count >= 4 ? `MEGA STRIKE +${count}!!` : `DRAW COMBO +${count}!`,
        subtitle: `${fx.actorNickname || 'Pemain'} melipatgandakan hukuman kartu!`,
        count,
        colorHex: count >= 4 ? '#EF4444' : '#F97316',
      });
      setTimeout(() => setComboBanner(null), 2200);
    } else if (fx.type === 'skip') {
      setComboBanner({
        id: `combo-${Date.now()}`,
        type: 'skip_combo',
        title: 'TURN LOCKED! 🚫',
        subtitle: `${fx.targetNickname || 'Lawan'} kehilangan giliran!`,
        colorHex: '#FB7185',
      });
      setTimeout(() => setComboBanner(null), 1800);
    } else if (fx.type === 'reverse') {
      setComboBanner({
        id: `combo-${Date.now()}`,
        type: 'reverse_clash',
        title: 'REVERSE COUNTER! ⇄',
        subtitle: 'Arah giliran berhasil diputar balik!',
        colorHex: '#38BDF8',
      });
      setTimeout(() => setComboBanner(null), 1800);
    } else if (fx.type === 'wild') {
      setComboBanner({
        id: `combo-${Date.now()}`,
        type: 'wild_chain',
        title: 'COLOR SHIFT! 🌈',
        subtitle: `Meja berganti ke warna ${fx.chosenColor ? fx.chosenColor.toUpperCase() : 'BARU'}!`,
        colorHex: '#A855F7',
      });
      setTimeout(() => setComboBanner(null), 1800);
    }

    if (fx.type === 'catch' || fx.type === 'swap' || fx.type === 'rotate') {
      addToast(fx.message, fx.type === 'catch' ? 'warning' : 'info');
    }
  }, [unoState?.lastFx, addToast]);

  const emitUnoInput = useCallback(
    (payload: any) => {
      if (activeSocket) activeSocket.emit('game:input', payload);
    },
    [activeSocket]
  );

  const commitPlayCard = useCallback(
    (card: UnoCardType, chosenColor?: UnoColor, targetPlayerId?: string) => {
      if (!unoState) return;
      const resolvedColor: UnoColor =
        chosenColor || (card.color === 'wild' ? unoState.activeColor : card.color);
      soundManager.playCardFlick();
      setOptimisticMove({
        cardId: card.id,
        card,
        color: resolvedColor,
        baseVersion: unoState.stateVersion || 0,
      });

      // Spawn flying card animation from player hand to center
      setCardFlights((prev) => [
        ...prev,
        {
          id: `my-play-${card.id}-${Date.now()}`,
          card,
          from: 'hand',
          to: 'center',
          duration: 0.35,
          isFaceDown: false,
        },
      ]);

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
      if (card.color === 'wild') { setPendingWildCard(card); return; }
      if (unoState.gameMode === 'uno-chaos' && card.value === '7') { setPendingSwapCard(card); return; }
      commitPlayCard(card);
    },
    [unoState, commitPlayCard]
  );

  const handleFlightComplete = useCallback((id: string) => {
    setCardFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrawCard = useCallback(() => {
    soundManager.playCardDraw();
    lastLocalDrawAtRef.current = Date.now();
    // Immediate optimistic flight from deck to hand
    setCardFlights((prev) => [
      ...prev,
      {
        id: `local-draw-${Date.now()}`,
        from: 'deck',
        to: 'hand',
        duration: 0.34,
        isFaceDown: true,
      },
    ]);
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!unoState || unoState.status === 'finished') return;
      const isMyTurn = unoState.currentTurnPlayerId === playerId && !optimisticMove;
      if (e.code === 'Space' && isMyTurn) {
        e.preventDefault();
        unoState.drawnPlayableCardId ? handlePassTurn() : handleDrawCard();
      } else if (e.key === 'u' || e.key === 'U') {
        handleCallUno();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [unoState, playerId, optimisticMove, handleDrawCard, handlePassTurn, handleCallUno]);

  const opponentsOrdered = useMemo<UnoPlayerPublic[]>(() => {
    if (!unoState) return [];
    const order = unoState.playerOrder || [];
    const myIdx = order.indexOf(playerId);
    const orderedIds = myIdx >= 0
      ? [...order.slice(myIdx + 1), ...order.slice(0, myIdx)]
      : order;
    return orderedIds
      .map((id) => unoState.players[id])
      .filter((p): p is UnoPlayerPublic => Boolean(p));
  }, [unoState, playerId]);

  if (!unoState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#030810] text-slate-300 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse">
            <span className="text-2xl font-black italic text-white drop-shadow">UNO</span>
          </div>
        </div>
        <span className="text-sm font-black text-slate-300 tracking-wide">Menyiapkan Meja UNO Party...</span>
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

  // Calculate next turn player based on current direction
  const nextTurnPlayerId = useMemo(() => {
    if (!unoState) return undefined;
    const order = unoState.playerOrder || [];
    if (order.length <= 1) return undefined;
    const currentIdx = order.indexOf(unoState.currentTurnPlayerId);
    if (currentIdx === -1) return undefined;
    const step = unoState.direction === 1 ? 1 : -1;
    const nextIdx = (currentIdx + step + order.length) % order.length;
    return order[nextIdx];
  }, [unoState?.playerOrder, unoState?.currentTurnPlayerId, unoState?.direction]);

  const nextTurnPlayer = nextTurnPlayerId ? unoState.players[nextTurnPlayerId] : undefined;

  const modeBadgeLabel =
    unoState.gameMode === 'uno-chaos' ? 'Chaos 7-0'
    : unoState.gameMode === 'uno-stack' ? 'Turbo Stack'
    : 'Classic';

  const modeBadgeColor =
    unoState.gameMode === 'uno-chaos' ? 'bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-200'
    : unoState.gameMode === 'uno-stack' ? 'bg-orange-500/25 border-orange-400/50 text-orange-200'
    : 'bg-indigo-500/25 border-indigo-400/40 text-indigo-200';

  return (
    <motion.div
      animate={shakeTrigger > 0 ? { x: [0, -7, 7, -4, 4, 0] } : undefined}
      transition={{ duration: 0.38 }}
      key={shakeTrigger > 0 ? `shake-${Math.floor(shakeTrigger / 9999)}` : 'uno-arena'}
      className="min-h-screen w-full text-white flex flex-col justify-between p-2 sm:p-3 pb-4 overflow-x-hidden relative select-none"
      style={{ background: '#030810' }}
    >
      {/* ── Deep casino stage + radial emerald felt tabletop ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 48%, #0E4F38 0%, #07291D 52%, #020B08 100%)',
        }}
      />

      {/* Oval Casino Table Rim & Inner Golden/Neon Trim */}
      <div className="fixed inset-2 sm:inset-4 md:inset-x-8 md:inset-y-4 rounded-[50px] sm:rounded-[90px] border-[4px] sm:border-[8px] border-[#0A1826]/90 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(0,0,0,0.9)] pointer-events-none" />
      <div
        className="fixed inset-4 sm:inset-7 md:inset-x-12 md:inset-y-7 rounded-[42px] sm:rounded-[78px] border border-amber-300/20 pointer-events-none transition-colors duration-700"
        style={{ boxShadow: `inset 0 0 50px ${colorMeta.hex}22` }}
      />

      {/* Overhead Stage Spotlight */}
      <motion.div
        animate={{ backgroundColor: colorMeta.hex }}
        transition={{ duration: 0.8 }}
        className="fixed -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[340px] rounded-full blur-[130px] opacity-25 pointer-events-none"
      />

      {/* Subtle noise grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic center color aura */}
      <motion.div
        animate={{ backgroundColor: colorMeta.hex, scale: [1, 1.06, 1] }}
        transition={{ backgroundColor: { duration: 0.8 }, scale: { repeat: Infinity, duration: 5, ease: 'easeInOut' } }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] rounded-full blur-[140px] opacity-25 pointer-events-none"
      />

      {/* ── TOP HEADER ── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between px-3 py-2 rounded-2xl bg-[#0C1A2A]/90 backdrop-blur-xl border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-30 mb-2 relative">
        {/* Accent line at top of header */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full pointer-events-none transition-all duration-700"
          style={{ background: `linear-gradient(90deg, transparent, ${colorMeta.hex}80, transparent)` }}
        />

        <div className="flex items-center gap-2.5 min-w-0">
          {myPlayer && <ClimberAvatarIcon avatar={myPlayer.avatar} size={34} shape="circle" />}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white">UNO Party</h3>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border ${modeBadgeColor} uppercase`}>
                {modeBadgeLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
              Room <strong className="text-amber-400 font-black">{room?.code}</strong>
              {' '}• {unoState.playerOrder.length} Pemain
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ping pill */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-black"
            style={{
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.3)',
              color: '#6EE7B7',
            }}
          >
            <Zap className="w-3 h-3" />
            <span>{ping > 0 ? `${ping}ms` : 'Live'}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/12 hover:bg-amber-500/22 border border-amber-500/30 text-amber-300 text-[11px] font-black transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rank</span>
          </button>

          {unoState.playerOrder.length > 2 && (
            <button
              type="button"
              onClick={() => setIsVoteKickModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/22 border border-rose-500/30 text-rose-300 text-[11px] font-black transition-all cursor-pointer"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kick</span>
            </button>
          )}

          <MusicControl compact />

          <button
            type="button"
            onClick={handleLeaveRoom}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-600/18 border border-white/10 hover:border-rose-500/40 text-xs font-bold text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <ActiveVoteKickBanner />

      {/* ── OPPONENTS RING ── */}
      <UnoTableRing
        opponentsOrdered={opponentsOrdered}
        currentTurnPlayerId={unoState.currentTurnPlayerId}
        nextTurnPlayerId={nextTurnPlayerId}
        activeColor={displayedActiveColor}
        turnTimeLeft={turnTimeLeft}
        turnDurationSeconds={unoState.turnDurationSeconds || 20}
        lastFxActorId={unoState.lastFx?.actorId}
        lastFxTargetId={unoState.lastFx?.targetId}
        lastFxType={unoState.lastFx?.type}
        onCatchUno={handleCatchUno}
      />

      {/* ── CENTER TABLE ── */}
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
          nextTurnNickname={nextTurnPlayer?.nickname}
          turnTimeLeft={turnTimeLeft}
          onDrawClick={handleDrawCard}
        />

        {/* Live action ticker */}
        <AnimatePresence mode="wait">
          {unoState.lastMoveNotice && (
            <motion.div
              key={unoState.lastMoveNotice}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="mt-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 text-[11px] font-semibold text-slate-300 max-w-sm truncate text-center shadow-lg backdrop-blur-md"
            >
              {unoState.lastMoveNotice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── PLAYER HAND ── */}
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

      {/* VFX */}
      <UnoFxOverlay lastFx={unoState.lastFx} />

      {/* Card Flight & Combo Stacking Animations */}
      <UnoAnimationLayer
        flights={cardFlights}
        onFlightComplete={handleFlightComplete}
        comboBanner={comboBanner}
      />

      {/* Emotes & Chat */}
      <FloatingEmoteLayer />
      <LudoChatBox />
      <div className="fixed bottom-4 left-4 z-30">
        <EmotePicker />
      </div>

      {/* Modals */}
      <UnoColorPickerModal
        isOpen={Boolean(pendingWildCard)}
        isWildDraw4={pendingWildCard?.value === 'wild_draw4'}
        onSelectColor={(chosenColor) => {
          if (pendingWildCard) commitPlayCard(pendingWildCard, chosenColor);
          setPendingWildCard(null);
        }}
        onCancel={() => setPendingWildCard(null)}
      />

      <UnoSwapTargetModal
        isOpen={Boolean(pendingSwapCard)}
        opponents={opponentsOrdered}
        onSelectTarget={(targetId) => {
          if (pendingSwapCard) commitPlayCard(pendingSwapCard, undefined, targetId);
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

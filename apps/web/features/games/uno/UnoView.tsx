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
  const [heldTopCard, setHeldTopCard] = useState<{ flightId: string; card: UnoCardType } | null>(null);
  const prevHandCountRef = useRef<number>(0);
  const prevTopCardIdRef = useRef<string>('');
  const prevTopCardRef = useRef<UnoCardType | null>(null);
  const lastFxSeqRef = useRef<number>(0);
  const lastLocalDrawAtRef = useRef<number>(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // Skip duplicate flight if we already triggered an instant local draw or penalty deal
      if (recentlyDrewLocally) {
        prevHandCountRef.current = currentHandCount;
        return;
      }
      const newFlights: CardFlightEvent[] = [];
      for (let i = 0; i < Math.min(drawnCount, 6); i++) {
        newFlights.push({
          id: `draw-${Date.now()}-${i}`,
          from: 'deck',
          to: 'hand',
          duration: 0.78,
          delay: i * 0.14,
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
        const flightId = `play-${currentTopId}-${Date.now()}`;
        if (prevTopCardRef.current) {
          setHeldTopCard({ flightId, card: prevTopCardRef.current });
        }
        // Show card at center only (replace any previous showcase so cards never stack on screen)
        setCardFlights((prev) => [
          ...prev.filter((f) => !f.showcaseFirst),
          {
            id: flightId,
            card: unoState.topCard,
            from: actorId || 'opponent',
            to: 'center',
            duration: 1.05,
            isFaceDown: false,
            showcaseFirst: true,
            actorName: unoState.lastFx?.actorNickname || (actorId ? unoState.players[actorId]?.nickname : undefined),
          },
        ]);
      }
    }
    prevTopCardIdRef.current = currentTopId;
    prevTopCardRef.current = unoState.topCard;
  }, [unoState?.topCard?.id, playerId]);

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

    const showBanner = (banner: ComboCardBanner, durationMs: number) => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      setComboBanner(banner);
      comboTimerRef.current = setTimeout(() => setComboBanner(null), durationMs);
    };

    const spawnSlowDeal = (recipientId: string | undefined, totalCards: number) => {
      if (!recipientId || totalCards <= 0) return;
      const isMeRecipient = recipientId === playerId;
      if (isMeRecipient) lastLocalDrawAtRef.current = Date.now();
      const dealCount = Math.min(totalCards, 8);
      const flights: CardFlightEvent[] = [];
      const baseTs = Date.now();
      for (let i = 0; i < dealCount; i++) {
        flights.push({
          id: `deal-${baseTs}-${i}`,
          from: 'deck',
          to: isMeRecipient ? 'hand' : recipientId,
          duration: 0.85,
          delay: i * 0.16,
          isFaceDown: true,
        });
      }
      setCardFlights((prev) => [...prev, ...flights]);
    };

    // Trigger COMBO banners for action chains / heavy plays
    if (fx.type === 'draw' && (fx.drawCount || 1) >= 2) {
      const count = fx.drawCount || 2;
      showBanner({
        id: `combo-${fx.seq}`,
        type: 'draw_chain',
        title: `KENA +${count} KARTU!!`,
        subtitle: `${fx.actorNickname || 'Pemain'} menarik total ${count} kartu dari deck!`,
        count,
        colorHex: count >= 6 ? '#EF4444' : '#F97316',
      }, 2400);
      spawnSlowDeal(fx.actorId, count);
    } else if (fx.type === 'draw' && fx.actorId && fx.actorId !== playerId) {
      // Single card draw by opponent: animate 1 slow card from deck to their pod
      spawnSlowDeal(fx.actorId, 1);
    } else if (fx.type === 'draw2' || fx.type === 'wild_draw4') {
      const count = fx.drawCount || (fx.type === 'draw2' ? 2 : 4);
      showBanner({
        id: `combo-${fx.seq}`,
        type: 'draw_chain',
        title: count >= 4 ? `MEGA COMBO +${count}!!` : `DRAW COMBO +${count}!`,
        subtitle: `${fx.actorNickname || 'Pemain'} menumpuk total hukuman +${count} kartu!`,
        count,
        colorHex: count >= 4 ? '#EF4444' : '#F97316',
      }, 2200);
      // In non-stack mode, victim receives cards immediately
      if ((unoState.pendingDrawCount || 0) === 0 && fx.targetId) {
        spawnSlowDeal(fx.targetId, count);
      }
    } else if (fx.type === 'skip') {
      showBanner({
        id: `combo-${fx.seq}`,
        type: 'skip_combo',
        title: 'TURN LOCKED! 🚫',
        subtitle: `${fx.targetNickname || 'Lawan'} kehilangan giliran!`,
        colorHex: '#FB7185',
      }, 1700);
    } else if (fx.type === 'reverse') {
      showBanner({
        id: `combo-${fx.seq}`,
        type: 'reverse_clash',
        title: 'REVERSE! ⇄',
        subtitle: 'Arah giliran diputar balik!',
        colorHex: '#38BDF8',
      }, 1700);
    } else if (fx.type === 'wild') {
      showBanner({
        id: `combo-${fx.seq}`,
        type: 'wild_chain',
        title: 'COLOR SHIFT! 🌈',
        subtitle: `Meja berganti ke warna ${fx.chosenColor ? fx.chosenColor.toUpperCase() : 'BARU'}!`,
        colorHex: '#A855F7',
      }, 1700);
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

      // Show card at center first, then land on discard pile; keep previous topCard on pile until landing
      const flightId = `my-play-${card.id}-${Date.now()}`;
      if (unoState.topCard) {
        setHeldTopCard({ flightId, card: unoState.topCard });
      }
      setCardFlights((prev) => [
        ...prev.filter((f) => !f.showcaseFirst),
        {
          id: flightId,
          card,
          from: 'hand',
          to: 'center',
          duration: 0.95,
          isFaceDown: false,
          showcaseFirst: true,
          actorName: 'Anda',
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
    setHeldTopCard((curr) => (curr?.flightId === id ? null : curr));
  }, []);

  const handleDrawCard = useCallback(() => {
    soundManager.playCardDraw();
    lastLocalDrawAtRef.current = Date.now();
    // Immediate optimistic flight from deck to hand (smooth & unhurried)
    setCardFlights((prev) => [
      ...prev,
      {
        id: `local-draw-${Date.now()}`,
        from: 'deck',
        to: 'hand',
        duration: 0.75,
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

  // Calculate next turn player based on current direction (must be before early return!)
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
  const displayedTopCard = heldTopCard ? heldTopCard.card : (optimisticMove?.card || unoState.topCard);
  const displayedHand = optimisticMove
    ? (unoState.myHand || []).filter((c) => c.id !== optimisticMove.cardId)
    : unoState.myHand || [];
  const displayedPlayableIds = optimisticMove ? [] : unoState.playableCardIds || [];

  const colorMeta = UNO_COLOR_META[displayedActiveColor] || UNO_COLOR_META.blue;
  const currentTurnPlayer = unoState.players[unoState.currentTurnPlayerId];
  const canDraw = isMyTurn && !unoState.drawnPlayableCardId;

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
            'radial-gradient(ellipse 90% 80% at 50% 48%, #115E43 0%, #07291D 52%, #020B08 100%)',
        }}
      />

      {/* Casino felt diamond lattice pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(#ffffff 0.75px, transparent 0.75px), radial-gradient(#ffffff 0.75px, transparent 0.75px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      />

      {/* Diagonal subtle felt weave */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0px, rgba(255,255,255,0.25) 1px, transparent 1px, transparent 16px)',
        }}
      />

      {/* Oval Casino Table Rim & Inner Golden/Neon Trim */}
      <div className="fixed inset-1.5 sm:inset-4 md:inset-x-8 md:inset-y-4 rounded-[34px] sm:rounded-[90px] border-[3px] sm:border-[8px] border-[#0A1826]/90 md:shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_0_50px_rgba(0,0,0,0.9)] pointer-events-none" />
      <div
        className="fixed inset-3 sm:inset-7 md:inset-x-12 md:inset-y-7 rounded-[28px] sm:rounded-[78px] border border-amber-300/20 pointer-events-none transition-colors duration-700"
        style={{ boxShadow: `inset 0 0 36px ${colorMeta.hex}20` }}
      />
      <div
        className="hidden sm:block fixed inset-6 sm:inset-10 md:inset-x-16 md:inset-y-10 rounded-[36px] sm:rounded-[68px] border border-dashed border-white/10 pointer-events-none"
      />

      {/* Subtle center tabletop watermark */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <div className="text-[56px] sm:text-[140px] font-black italic tracking-tighter text-white/[0.025] -rotate-12">
          UNO PARTY
        </div>
      </div>

      {/* Lightweight mobile radial color aura (zero GPU blur filter cost) */}
      <div
        className="md:hidden fixed inset-0 pointer-events-none opacity-20 transition-colors duration-500"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${colorMeta.hex} 0%, transparent 62%)`,
        }}
      />

      {/* Ambient corner glow orbs (desktop only - expensive blur on mobile GPU) */}
      <div
        className="hidden md:block fixed -bottom-24 -left-24 w-72 h-72 rounded-full blur-[110px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: colorMeta.hex }}
      />
      <div
        className="hidden md:block fixed -bottom-24 -right-24 w-72 h-72 rounded-full blur-[110px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: colorMeta.hex }}
      />

      {/* Overhead Stage Spotlight (desktop only) */}
      <motion.div
        animate={{ backgroundColor: colorMeta.hex }}
        transition={{ duration: 0.8 }}
        className="hidden md:block fixed -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[340px] rounded-full blur-[130px] opacity-25 pointer-events-none"
      />

      {/* Subtle noise grain overlay (desktop only - SVG feTurbulence is heavy on mobile) */}
      <div
        className="hidden md:block fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Dynamic center color aura (desktop only) */}
      <motion.div
        animate={{ backgroundColor: colorMeta.hex }}
        transition={{ duration: 0.8 }}
        className="hidden md:block fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[360px] rounded-full blur-[140px] opacity-25 pointer-events-none"
      />

      {/* ── TOP HEADER ── */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-[#0C1A2A]/95 md:bg-[#0C1A2A]/90 md:backdrop-blur-xl border border-white/8 shadow-lg md:shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-30 mb-1.5 sm:mb-2 relative">
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

      {/* ── CIRCULAR TABLE RING + CENTER PILES ── */}
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
      >
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
              className="mt-2 px-3.5 py-1 rounded-full bg-[#07111C]/90 md:bg-black/50 border border-white/10 text-[11px] font-semibold text-slate-300 max-w-xs sm:max-w-sm truncate text-center shadow-md md:shadow-lg md:backdrop-blur-md"
            >
              {unoState.lastMoveNotice}
            </motion.div>
          )}
        </AnimatePresence>
      </UnoTableRing>

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

      {/* Card Flight & Combo Stacking Animations */}
      <UnoAnimationLayer
        flights={cardFlights}
        onFlightComplete={handleFlightComplete}
        comboBanner={comboBanner}
      />

      {/* Emotes & Chat */}
      <FloatingEmoteLayer />
      <LudoChatBox />
      <EmotePicker />

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

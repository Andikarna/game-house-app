'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { PanjatPinangCanvas } from './PanjatPinangCanvas';
import { ClimberStatusHUD } from './ClimberStatusHUD';
import { SkillActionBar } from './SkillActionBar';
import { VirtualControls } from './VirtualControls';
import { GameSpectatorHUD } from './GameSpectatorHUD';
import { GameResultModal } from './GameResultModal';
import { GameStartIntroOverlay } from './GameStartIntroOverlay';
import { EmotePicker } from '../../../components/emotes/EmotePicker';
import { FloatingEmoteLayer } from '../../../components/emotes/FloatingEmoteLayer';
import { useKeyboardControls } from '../../../hooks/useKeyboardControls';
import { soundManager } from '../../../components/audio/SoundManager';
import { SkillType } from '@gamehouse/shared';

export const PanjatPinangView: React.FC = () => {
  const {
    socket,
    room,
    playerId,
    gameState,
    countdown,
    gameResults,
    setGameResults,
  } = useGameStore();

  const isHost = room?.hostId === playerId;
  const [showGo, setShowGo] = useState(false);
  const prevCountdownRef = useRef<number | null>(countdown);

  // Auto-start Indonesian 17 Agustus Party BGM during gameplay
  useEffect(() => {
    soundManager.startBGM();
  }, []);

  // Detect transition from countdown 1 -> 0 / started to blast "GO!"
  useEffect(() => {
    const prev = prevCountdownRef.current;
    if (prev === 1 && (countdown === null || countdown === 0)) {
      setShowGo(true);
      const timer = setTimeout(() => {
        setShowGo(false);
      }, 950);
      return () => clearTimeout(timer);
    }
    prevCountdownRef.current = countdown;
  }, [countdown]);

  const handleActivateSkill = useCallback((skill: SkillType) => {
    if (socket && socket.connected) {
      socket.emit('player:skill', skill);
    }
  }, [socket]);

  const { activeInputs, setInputKey } = useKeyboardControls(handleActivateSkill);

  const handlePlayAgain = () => {
    if (socket && socket.connected && isHost) {
      socket.emit('game:restart');
      setGameResults(null);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && socket.connected) {
      socket.emit('room:leave');
      window.location.href = '/';
    }
  };

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Loading Panjat Pinang Battle arena...
      </div>
    );
  }

  const myClimber = gameState.climbers[playerId];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 touch-control">
      {/* 2D Canvas Scene */}
      <PanjatPinangCanvas gameState={gameState} myPlayerId={playerId} />

      {/* Top Spectator HUD: Timer, Mode, Live Rankings & Minimap */}
      <GameSpectatorHUD gameState={gameState} />

      {/* Mobile Top Status Card (Ultra-compact 30px HUD strip on mobile, leaving minimap open at right) */}
      <div className="sm:hidden absolute top-12 left-2 right-14 z-20 pointer-events-none">
        <ClimberStatusHUD climber={myClimber} compact />
      </div>

      {/* ================= BOTTOM IN-GAME CONTROLS (ELEVATED FOR MOBILE SCREENS) ================= */}
      <div className="absolute bottom-6 sm:bottom-0 inset-x-0 z-20 pointer-events-none">
        {/* MOBILE CONTROLS (D-Pad on left thumb, Action & Skills on right thumb) */}
        <div className="sm:hidden w-full">
          <VirtualControls
            inputState={activeInputs}
            setInputKey={setInputKey}
            climber={myClimber}
            onActivateSkill={handleActivateSkill}
          />
        </div>

        {/* DESKTOP HUD (Status card on left + 6 Skill Action Bar on right) */}
        <div className="hidden sm:flex items-end justify-between gap-4 max-w-5xl mx-auto px-6 pb-6 pointer-events-auto">
          {/* Climber Stats */}
          <div className="w-80">
            <ClimberStatusHUD climber={myClimber} />
          </div>

          {/* 6 Skills Action Bar */}
          <SkillActionBar climber={myClimber} onActivateSkill={handleActivateSkill} />
        </div>
      </div>

      {/* Modern High-Resolution Game Start / Countdown Intro */}
      <GameStartIntroOverlay
        countdown={countdown}
        showGo={showGo}
        room={room}
        gameState={gameState}
        myPlayerId={playerId}
      />

      {/* Floating Animated Emote Broadcast Layer */}
      <FloatingEmoteLayer />

      {/* In-Game Emote Trigger & Drawer Button */}
      <EmotePicker buttonPosition="top-right" />

      {/* Match Result Screen */}
      {gameResults && (
        <GameResultModal
          results={gameResults}
          isHost={isHost}
          onPlayAgain={handlePlayAgain}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { LudoGameState } from '@gamehouse/shared';
import { LudoBoard } from './LudoBoard';
import { LudoDice } from './LudoDice';
import { LudoTurnHUD } from './LudoTurnHUD';
import { LudoResultModal } from './LudoResultModal';
import { soundManager } from '../../../components/audio/SoundManager';
import { LogOut, Volume2, VolumeX, Dices, Trophy, Swords } from 'lucide-react';
import Link from 'next/link';

export const LudoView: React.FC = () => {
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
  const [isAudioMuted, setIsAudioMuted] = useState(soundManager.getIsMuted());

  // Tracking refs to detect dice roll and token captures for sound effects
  const prevDiceRef = useRef<number | null>(null);
  const prevTokensStateRef = useRef<Record<string, Record<number, string>>>({});
  const isFirstRender = useRef(true);

  // Auto-play party BGM during Ludo match
  useEffect(() => {
    soundManager.startBGM();
    return soundManager.subscribeMusicChange((playing) => {
      setIsAudioMuted(!playing);
    });
  }, []);

  // Reactive Sound Effects for Dice Roll and Knocking Opponents Back to Base
  useEffect(() => {
    if (!gameState || gameState.gameId !== 'ludo') return;
    const ludo = gameState as LudoGameState;

    // 1. Dice Roll Sound: Trigger when dice value is newly rolled
    if (ludo.diceValue !== null && ludo.diceValue !== prevDiceRef.current) {
      soundManager.playDiceRoll();
      prevDiceRef.current = ludo.diceValue;
    } else if (ludo.diceValue === null) {
      prevDiceRef.current = null;
    }

    // 2. Token Capture Sound: Detect if any token transitioned from 'track'/'home-stretch' to 'base'
    if (!isFirstRender.current) {
      let capturedPlayerNickname: string | null = null;

      Object.values(ludo.players).forEach((p) => {
        p.tokens.forEach((t) => {
          const prevState = prevTokensStateRef.current[p.playerId]?.[t.id];
          if ((prevState === 'track' || prevState === 'home-stretch') && t.state === 'base') {
            capturedPlayerNickname = p.nickname;
          }
        });
      });

      if (capturedPlayerNickname) {
        // Dramatic comic BONK + flying slide whistle sound effect!
        soundManager.playTokenCapture();
        addToast(`💥 Bidak ${capturedPlayerNickname} dipulangkan ke markas!`, 'warning');
      }
    } else {
      isFirstRender.current = false;
    }

    // Update tokens cache
    const currentTokensMap: Record<string, Record<number, string>> = {};
    Object.values(ludo.players).forEach((p) => {
      currentTokensMap[p.playerId] = {};
      p.tokens.forEach((t) => {
        currentTokensMap[p.playerId][t.id] = t.state;
      });
    });
    prevTokensStateRef.current = currentTokensMap;
  }, [gameState, addToast]);

  const handleToggleAudio = () => {
    const isPlaying = soundManager.toggleMusic();
    setIsAudioMuted(!isPlaying);
  };

  const handleRollDice = () => {
    if (socket && socket.connected) {
      socket.emit('game:input', { action: 'roll-dice' });
    }
  };

  const handleSelectToken = (tokenIndex: number) => {
    if (socket && socket.connected) {
      socket.emit('game:input', { action: 'move-token', tokenIndex });
    }
  };

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
          {/* Audio BGM Toggle Button */}
          <button
            type="button"
            onClick={handleToggleAudio}
            className="p-2 rounded-xl bg-surface-elevated border border-slate-700/60 text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            title={isAudioMuted ? 'Nyalakan Musik (BGM)' : 'Matikan Musik (Mute)'}
          >
            {isAudioMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            )}
          </button>

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

      {/* ================= 2. ACTIVE TURN HUD ================= */}
      <div className="w-full max-w-xl z-20 mb-2">
        <LudoTurnHUD gameState={ludoState} myPlayerId={playerId} />
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
        />
      </footer>

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

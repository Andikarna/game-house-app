'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { useSocket } from '../../../hooks/useSocket';
import { VillageBackground } from './components/VillageBackground';
import { RoleRevealScreen } from './components/RoleRevealScreen';
import { ClueScreen } from './components/ClueScreen';
import { DiscussionScreen } from './components/DiscussionScreen';
import { VotingScreen } from './components/VotingScreen';
import { ImpostorGuessModal } from './components/ImpostorGuessModal';
import { ResultScreen } from './components/ResultScreen';
import { ImpostorPublicGameState } from '@gamehouse/shared';
import { soundManager } from '../../../components/audio/SoundManager';
import { MusicControl } from '../../../components/audio/MusicControl';
import { Copy, Check, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const ImpostorDesaView: React.FC = () => {
  const router = useRouter();
  const socket = useSocket();
  const { room, playerId, gameState, impostorRole, addToast } = useGameStore();

  const [copiedCode, setCopiedCode] = React.useState(false);

  useEffect(() => {
    soundManager.playImpostorBGM();
  }, []);

  // Fallback state if gameState is not yet populated
  const state = gameState as ImpostorPublicGameState | null;

  const myPlayer = room?.players.find(p => p.id === playerId);
  const isHost = Boolean(myPlayer?.isHost || room?.hostId === playerId);

  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    addToast('Kode room disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('room:leave');
    }
    router.push('/');
  };

  // 1. Ready role action
  const handleReadyRole = () => {
    if (socket) {
      socket.emit('impostor:ready-role');
    }
  };

  // 2. Submit clue action
  const handleSubmitClue = (clue: string) => {
    if (socket) {
      socket.emit('impostor:submit-clue', { clue });
    }
  };

  // 3. Start voting early from discussion
  const handleStartVoting = () => {
    if (socket) {
      socket.emit('impostor:start-voting');
    }
  };

  // 4. Submit vote action
  const handleSubmitVote = (targetPlayerId: string) => {
    if (socket) {
      socket.emit('impostor:submit-vote', { targetPlayerId });
    }
  };

  // 4b. Send debate chat message
  const handleSendChat = (message: string) => {
    if (socket) {
      socket.emit('impostor:send-chat', { message });
    }
  };

  // 5. Submit guess action (impostor only)
  const handleSubmitGuess = (guessedWord: string) => {
    if (socket) {
      socket.emit('impostor:submit-guess', { guessedWord });
    }
  };

  // 6. Rematch action (Host only)
  const handleRematch = () => {
    if (socket) {
      socket.emit('game:restart');
    }
  };

  if (!state || state.gameId !== 'impostor-desa') {
    return (
      <VillageBackground>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-amber-200 font-bold text-sm tracking-wide drop-shadow">
            Menyiapkan arena Impostor Desa...
          </p>
        </div>
      </VillageBackground>
    );
  }

  const phase = state.phase;

  return (
    <VillageBackground>
      {/* Top Navigation HUD */}
      <header className="w-full bg-[#18352B] text-white px-4 py-2.5 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🌾</span>
            <span className="font-black text-sm tracking-wider uppercase text-amber-300">
              IMPOSTOR DESA
            </span>
          </div>

          {/* Room Code Pill */}
          {room?.code && (
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-xl text-xs font-black transition-colors"
              title="Klik untuk salin kode room"
            >
              <span className="text-amber-200">KODE:</span>
              <span className="tracking-widest font-mono">{room.code}</span>
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/60" />
              )}
            </button>
          )}
        </div>

        {/* Phase Indicator, Music Control & Leave Button */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 bg-[#2F7D55] px-2.5 py-0.8 rounded-lg text-[11px] font-black uppercase tracking-wider text-white">
            <span>Fase: {phase.replace('-', ' ')}</span>
          </div>

          <MusicControl variant="village" />

          <button
            onClick={handleLeaveRoom}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Keluar Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Phase Screens */}
      <main className="flex-1 flex flex-col justify-center">
        {phase === 'role-reveal' && (
          <RoleRevealScreen
            roleData={impostorRole}
            gameState={state}
            myPlayerId={playerId}
            onReady={handleReadyRole}
          />
        )}

        {phase === 'clue' && (
          <ClueScreen
            gameState={state}
            roleData={impostorRole}
            myPlayerId={playerId}
            onSubmitClue={handleSubmitClue}
          />
        )}

        {phase === 'discussion' && (
          <DiscussionScreen
            gameState={state}
            roleData={impostorRole}
            myPlayerId={playerId}
            isHost={isHost}
            onStartVoting={handleStartVoting}
            onSendChat={handleSendChat}
          />
        )}

        {(phase === 'voting' || phase === 'revote') && (
          <VotingScreen
            gameState={state}
            roleData={impostorRole}
            myPlayerId={playerId}
            onSubmitVote={handleSubmitVote}
            onSendChat={handleSendChat}
          />
        )}

        {phase === 'impostor-guess' && (
          <>
            <VotingScreen
              gameState={state}
              roleData={impostorRole}
              myPlayerId={playerId}
              onSubmitVote={handleSubmitVote}
              onSendChat={handleSendChat}
            />
            <ImpostorGuessModal
              gameState={state}
              myPlayerId={playerId}
              onSubmitGuess={handleSubmitGuess}
            />
          </>
        )}

        {phase === 'result' && (
          <ResultScreen
            gameState={state}
            myPlayerId={playerId}
            isHost={isHost}
            onRematch={handleRematch}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
    </VillageBackground>
  );
};

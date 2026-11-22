'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../../stores/useGameStore';
import { useSocket } from '../../../hooks/useSocket';
import { CouncilBackground } from './components/CouncilBackground';
import { TurnSlotTracker } from './components/TurnSlotTracker';
import { SecretIdentityHUD } from './components/SecretIdentityHUD';
import { MainCardSelectionScreen } from './components/MainCardSelectionScreen';
import { ActionPhaseScreen } from './components/ActionPhaseScreen';
import { VotingSubmissionScreen } from './components/VotingSubmissionScreen';
import { VoteManipulationScreen } from './components/VoteManipulationScreen';
import { RoundResultScreen } from './components/RoundResultScreen';
import { MatchResultScreen } from './components/MatchResultScreen';
import { HiddenTeamRulesModal } from './components/HiddenTeamRulesModal';
import {
  HiddenTeamPublicGameState,
  HiddenTeamActionPayload,
} from '@gamehouse/shared';
import { Copy, Check, LogOut, HelpCircle, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const HiddenTeamView: React.FC = () => {
  const router = useRouter();
  const socket = useSocket();
  const { room, playerId, gameState, hiddenTeamPrivate, addToast } = useGameStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const state = gameState as HiddenTeamPublicGameState | null;

  const myPlayer = room?.players.find((p) => p.id === playerId);
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

  // 1. Role 5: Select Main Card
  const handleSelectMainCard = (cardId: string) => {
    if (socket) {
      socket.emit('hidden-team:select-main-card', { cardId });
    }
  };

  // 2. Action Phase: Execute Role Ability or Pass
  const handleExecuteAction = (payload: HiddenTeamActionPayload) => {
    if (socket) {
      socket.emit('hidden-team:execute-action', payload);
    }
  };

  // 3. Voting Phase: Submit Cards
  const handleSubmitVotes = (cardIds: string[]) => {
    if (socket) {
      socket.emit('hidden-team:submit-votes', { cardIds });
    }
  };

  // 4. Manipulation Phase: Role 4 Decision
  const handleInspectDecision = (decision: 'KEEP' | 'DISCARD') => {
    if (socket) {
      socket.emit('hidden-team:inspect-decision', { decision });
    }
  };

  // 5. Host Rematch
  const handleRematch = () => {
    if (socket) {
      socket.emit('game:restart');
    }
  };

  if (!state || state.gameId !== 'hidden-team') {
    return (
      <CouncilBackground>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-rose-300 font-bold text-sm tracking-wide drop-shadow">
            Menyiapkan Meja Dewan Hidden Team...
          </p>
        </div>
      </CouncilBackground>
    );
  }

  const phase = state.phase;

  return (
    <CouncilBackground>
      {/* Top Navigation Bar */}
      <header className="w-full bg-[#110E1A]/90 border-b border-slate-800/80 px-3 sm:px-6 py-2.5 backdrop-blur-md flex items-center justify-between gap-2 shadow-md">
        {/* Left: Game Title & Round Counter */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">🕵️</span>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-white tracking-tight flex items-center gap-2">
              <span>Hidden Team</span>
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                Ronde {state.roundNumber}/{state.totalRounds}
              </span>
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-rose-400 font-bold">🔴 {state.roundWins.RED}</span>
              <span>•</span>
              <span className="text-sky-400 font-bold">🔵 {state.roundWins.BLUE}</span>
              <span>•</span>
              <span className="text-amber-300 font-bold">⚖️ {state.roundWins.NEUTRAL}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Room Code Pill */}
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl bg-surface-elevated/80 border border-slate-700/80 hover:border-slate-500 text-xs font-bold text-slate-300 transition-colors"
            title="Salin Kode Room"
          >
            <span className="text-amber-400 font-black">{room?.code}</span>
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-1.5 sm:p-2 rounded-xl bg-surface-elevated/80 border border-slate-700/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Cara Bermain"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeaveRoom}
            className="p-1.5 sm:p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 transition-colors"
            title="Keluar Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Confidential Secret Identity HUD (Team, Role, Hand) */}
      <SecretIdentityHUD privateState={hiddenTeamPrivate} />

      {/* Fixed Turn Slot 1-6 Tracker */}
      <TurnSlotTracker state={state} myPlayerId={playerId} />

      {/* Main Dynamic Game Area */}
      <main className="flex-1 flex flex-col justify-center">
        {phase === 'MAIN_CARD_SELECTION' && (
          <MainCardSelectionScreen
            state={state}
            privateState={hiddenTeamPrivate}
            onSelectMainCard={handleSelectMainCard}
          />
        )}

        {phase === 'ACTION_PHASE' && (
          <ActionPhaseScreen
            state={state}
            privateState={hiddenTeamPrivate}
            myPlayerId={playerId}
            onExecuteAction={handleExecuteAction}
          />
        )}

        {phase === 'VOTING_SUBMISSION' && (
          <VotingSubmissionScreen
            state={state}
            privateState={hiddenTeamPrivate}
            myPlayerId={playerId}
            onSubmitVotes={handleSubmitVotes}
          />
        )}

        {phase === 'VOTE_MANIPULATION' && (
          <VoteManipulationScreen
            state={state}
            privateState={hiddenTeamPrivate}
            onInspectDecision={handleInspectDecision}
          />
        )}

        {phase === 'ROUND_RESOLUTION' && (
          <RoundResultScreen
            state={state}
            roundResult={state.currentRoundResult}
          />
        )}

        {(phase === 'MATCH_RESOLUTION' || phase === 'MATCH_FINISHED') && (
          <MatchResultScreen
            matchResult={state.matchResult}
            isHost={isHost}
            onRematch={handleRematch}
          />
        )}
      </main>

      {/* Rules Modal */}
      <HiddenTeamRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </CouncilBackground>
  );
};

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ImpostorPublicGameState, 
  ImpostorPrivateRoleData, 
  IMPOSTOR_CATEGORIES 
} from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  Send, 
  MessageSquare,
  Sparkles,
  Lock,
  Check,
  AlertCircle
} from 'lucide-react';

interface VotingScreenProps {
  gameState: ImpostorPublicGameState;
  roleData?: ImpostorPrivateRoleData | null;
  myPlayerId: string;
  onSubmitVote: (targetPlayerId: string) => void;
  onSendChat?: (message: string) => void;
}

// 3D Red Push Pin (Thumbtack) Component
const PushPin: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    {/* Pin shadow on parchment */}
    <div className="absolute top-3.5 left-2.5 w-3.5 h-2 bg-black/35 rounded-full blur-[1.5px] transform rotate-12 pointer-events-none" />
    
    {/* Push Pin SVG */}
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="drop-shadow-md z-10">
      {/* Needle */}
      <line x1="16" y1="20" x2="16" y2="30" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      {/* Pin Body Lower Ring */}
      <ellipse cx="16" cy="20" rx="8" ry="3" fill="#991B1B" />
      {/* Pin Body Cone */}
      <path d="M10 18 L13 8 L19 8 L22 18 Z" fill="#DC2626" />
      {/* Top Head Grip */}
      <ellipse cx="16" cy="8" rx="6" ry="2.5" fill="#EF4444" />
      <circle cx="16" cy="6" r="4.5" fill="#EF4444" />
      {/* Specular White Highlight */}
      <ellipse cx="14.5" cy="5" rx="1.5" ry="1" fill="#FFFFFF" opacity="0.8" />
    </svg>
  </div>
);

const QUICK_CHATS = [
  'Kok Joko aneh?',
  'Aku duga Andi!',
  'Bukan aku sumpah!',
  'Petunjuknya pasaran!',
  'Aku warga asli!',
  'Curiga banget!',
];

export const VotingScreen: React.FC<VotingScreenProps> = ({
  gameState,
  roleData,
  myPlayerId,
  onSubmitVote,
  onSendChat,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isRevote = gameState.phase === 'revote';
  const hasVoted = gameState.votedPlayerIds.includes(myPlayerId);

  // Eligible candidates
  const candidateIds = gameState.eligibleCandidateIds;
  const eligiblePlayers = candidateIds
    .map(id => gameState.players[id])
    .filter(Boolean);

  const totalVoters = Object.values(gameState.players).filter(p => p.isConnected).length;
  const currentVotesCount = gameState.votedPlayerIds.length;

  // Auto-scroll chat on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.chatMessages?.length]);

  const validateMessage = (text: string): { isValid: boolean; forbiddenWord?: string } => {
    const cleanMsg = text.toLowerCase();
    const forbiddenList = new Set<string>();

    if (roleData?.secretWord) {
      forbiddenList.add(roleData.secretWord.toLowerCase());
    }

    const categoryConfig = IMPOSTOR_CATEGORIES[gameState.category];
    if (categoryConfig && categoryConfig.words) {
      categoryConfig.words.forEach(w => {
        if (w.length >= 2) forbiddenList.add(w.toLowerCase());
      });
    }

    gameState.clues.forEach(c => {
      if (c.clue && c.clue.trim().length >= 2) {
        forbiddenList.add(c.clue.trim().toLowerCase());
      }
    });

    for (const forbidden of Array.from(forbiddenList)) {
      if (forbidden.length < 2) continue;
      const escaped = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escaped}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(cleanMsg) || cleanMsg.includes(forbidden)) {
        return { isValid: false, forbiddenWord: forbidden };
      }
    }

    return { isValid: true };
  };

  const handleLockIn = () => {
    if (!selectedCandidateId || hasVoted) return;
    if (selectedCandidateId === myPlayerId) return;
    onSubmitVote(selectedCandidateId);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = chatInput.trim();
    if (!clean || !onSendChat) return;

    const validation = validateMessage(clean);
    if (!validation.isValid) {
      setChatError(`Dilarang menyebut kata rahasia atau kata terkait ("${validation.forbiddenWord}")!`);
      setTimeout(() => setChatError(''), 4000);
      return;
    }

    setChatError('');
    onSendChat(clean);
    setChatInput('');
  };

  const handleQuickChat = (text: string) => {
    const validation = validateMessage(text);
    if (!validation.isValid) {
      setChatError(`Dilarang menyebut kata rahasia atau kata terkait!`);
      setTimeout(() => setChatError(''), 3000);
      return;
    }
    if (onSendChat) {
      onSendChat(text);
    }
  };

  // Map of clue words given by players
  const clueByPlayerId = new Map<string, string>();
  gameState.clues.forEach(c => {
    clueByPlayerId.set(c.playerId, c.clue);
  });

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl mx-auto w-full z-10 my-auto">
      
      {/* Top Header: Title & Time Remaining Pill */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          {isRevote && (
            <div className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-400 text-rose-200 px-3 py-0.5 rounded-full text-xs font-black mb-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>VOTING SERI! REVOTE ANTARA KANDIDAT TERTINGGI</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FCD34D] tracking-tight uppercase drop-shadow-[0_3px_6px_rgba(0,0,0,0.6)] truncate">
            SIAPA IMPOSTORNYA?
          </h1>
          <p className="text-xs sm:text-sm font-bold text-amber-200/90 truncate">
            Pilih warga yang paling mencurigakan dari petunjuk yang diberikan.
          </p>
        </div>

        {/* Timer Pill matching Screen 4: "⏰ WAKTU: 45s" */}
        <div className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-sm sm:text-base shadow-lg border-2 ${
          gameState.phaseTimeRemaining <= 10
            ? 'bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white animate-pulse'
            : 'bg-gradient-to-b from-[#F59E0B] to-[#D97706] border-[#FDE68A] text-[#3E2714]'
        }`}>
          <span className="text-lg">⏰</span>
          <span className="tracking-wider">WAKTU: {gameState.phaseTimeRemaining}s</span>
        </div>
      </div>

      {/* Main Corkboard Notice Board Container */}
      <div className="w-full bg-[#4E2F16] rounded-3xl p-3 sm:p-4 shadow-2xl border-4 border-[#6C421E] mb-3">
        {/* Corkboard Textured Surface */}
        <div 
          className="w-full rounded-2xl p-3 sm:p-5 border-2 border-[#D7C29E] shadow-inner relative"
          style={{
            backgroundColor: '#C89D66',
            backgroundImage: 'radial-gradient(#9B6F38 1px, transparent 1px), radial-gradient(#9B6F38 1px, #C89D66 1px)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 8px 8px'
          }}
        >
          {/* Top Board Label & Votes Counter */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-[#3E2714] bg-[#FBF6EA]/80 px-2.5 py-0.5 rounded-md border border-[#9B6F38]/40 shadow-xs">
              Papan Pemungutan Suara
            </span>

            <div className="flex items-center gap-1.5 text-xs font-black text-[#3E2714] bg-[#FBF6EA]/80 px-3 py-0.5 rounded-full border border-[#9B6F38]/40 shadow-xs">
              <Users className="w-3.5 h-3.5 text-[#2F7D55]" />
              <span>{currentVotesCount} / {totalVoters} Suara Masuk</span>
            </div>
          </div>

          {/* Suspect Cards Grid (Pinned with Push Pins) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {eligiblePlayers.map((candidate) => {
              const isSelf = candidate.id === myPlayerId;
              const isSelected = selectedCandidateId === candidate.id;
              const candidateClue = clueByPlayerId.get(candidate.id);
              const candidateHasVoted = gameState.votedPlayerIds.includes(candidate.id);

              return (
                <div
                  key={candidate.id}
                  className="relative pt-3" // padding-top to make room for the push pin
                >
                  {/* Push Pin (Thumbtack) pinned to top-center of card */}
                  <div className="absolute top-0 inset-x-0 flex justify-center z-20 pointer-events-none">
                    <PushPin />
                  </div>

                  {/* Suspect Paper Card */}
                  <div
                    onClick={() => {
                      if (!isSelf && !hasVoted) {
                        setSelectedCandidateId(candidate.id);
                      }
                    }}
                    className={`relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all select-none text-center shadow-md ${
                      isSelf
                        ? 'bg-[#ECE5D8] border-[#B8A995] opacity-75 cursor-not-allowed'
                        : hasVoted
                        ? (isSelected 
                            ? 'bg-[#FFF2D4] border-[#EA580C] ring-2 ring-orange-500 shadow-lg'
                            : 'bg-[#FFFDF9] border-[#D7C29E] cursor-default')
                        : isSelected
                        ? 'bg-[#FFF2D4] border-[#EA580C] ring-4 ring-orange-400/50 shadow-xl scale-102 cursor-pointer'
                        : 'bg-[#FFFDF9] border-[#D7C29E] hover:border-[#EA580C]/70 hover:bg-[#FFF8EB] hover:scale-101 active:scale-98 cursor-pointer'
                    }`}
                  >
                    {/* Has Voted Checkmark Badge on card */}
                    {candidateHasVoted && (
                      <div className="absolute top-1 right-1" title="Sudah memilih">
                        <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* Suspect Avatar */}
                    <div className="my-1">
                      <ChibiAvatar
                        avatar={candidate.avatar || 'budi'}
                        size="sm"
                        isHost={candidate.isHost}
                      />
                    </div>

                    {/* Suspect Nickname */}
                    <p className="font-black text-xs text-[#3E2714] truncate w-full mb-1">
                      {candidate.nickname}
                      {isSelf && <span className="text-[10px] text-amber-700 ml-1">(Kamu)</span>}
                    </p>

                    {/* Petunjuk / Clue Given */}
                    <div className="w-full bg-[#FAF3E0] border border-[#D7C29E] rounded-xl px-1.5 py-1 mb-2">
                      <span className="text-[9px] font-bold uppercase text-[#7A4B23] block leading-tight">
                        Petunjuk:
                      </span>
                      <span className="text-xs font-black text-[#1E5738] truncate block">
                        {candidateClue ? `"${candidateClue}"` : '-'}
                      </span>
                    </div>

                    {/* Card Button / Action Label */}
                    {isSelf ? (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-md w-full">
                        Diri Sendiri
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#EA580C] px-2 py-1 rounded-lg w-full shadow-xs flex items-center justify-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Dipilih</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#5C3D24] bg-[#EFE3CF] hover:bg-[#E5D2B8] px-2 py-1 rounded-lg w-full transition-colors">
                        Pilih
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Area: Live Debate Chat (Left) & Lock Vote Button (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        
        {/* Left: Floating Live Debate Chat Speech Bubbles */}
        <div className="md:col-span-8 bg-[#18352B]/90 backdrop-blur-md border border-[#2F7D55]/60 rounded-2xl p-3 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Debat Warga (Live Chat)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-300/80">
              Saling bantah & cari impostornya!
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 mb-2 scrollbar-thin">
            {(!gameState.chatMessages || gameState.chatMessages.length === 0) ? (
              <p className="text-[11px] font-semibold text-white/50 italic py-2 text-center">
                Belum ada perdebatan... Gunakan tombol cepat di bawah untuk berdebat!
              </p>
            ) : (
              gameState.chatMessages.slice(-6).map((msg) => {
                const isMe = msg.playerId === myPlayerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-1.5 text-xs ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <span className="font-black text-amber-300 shrink-0">
                        {msg.nickname}:
                      </span>
                    )}
                    {/* Speech Bubble */}
                    <div className={`px-2.5 py-1 rounded-xl max-w-[80%] font-bold text-xs shadow-xs ${
                      isMe 
                        ? 'bg-[#2F7D55] text-white rounded-tr-none' 
                        : 'bg-white/90 text-[#18352B] rounded-tl-none'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Warning Alert if player tried to send forbidden words */}
          {chatError && (
            <div className="flex items-center gap-1.5 bg-rose-500/25 border border-rose-400 px-3 py-1 rounded-xl text-rose-200 text-xs font-bold animate-pulse mb-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-300" />
              <span>{chatError}</span>
            </div>
          )}

          {/* Policy Notice Pill */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-200/80 bg-black/30 px-2.5 py-0.5 rounded-lg border border-white/10 mb-2">
            <Lock className="w-3 h-3 text-amber-300 shrink-0" />
            <span>Dilarang membocorkan kata rahasia atau kata terkait dalam diskusi!</span>
          </div>

          {/* Quick-Message Preset Pills */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_CHATS.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleQuickChat(phrase)}
                className="bg-white/10 hover:bg-white/20 active:scale-95 text-amber-200 border border-white/15 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Custom Chat Input Field */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              maxLength={60}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ketik pendapat / tuduhanmu..."
              className="flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 py-1.5 bg-[#2F7D55] hover:bg-[#3ca971] disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-all"
            >
              <Send className="w-3 h-3" />
              <span>Kirim</span>
            </button>
          </form>
        </div>

        {/* Right: Big Orange 3D Pill Button "KUNCI PILIHAN" */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLockIn}
            disabled={!selectedCandidateId || hasVoted}
            className={`w-full py-4 px-6 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider shadow-2xl transition-all flex items-center justify-center gap-2 select-none ${
              hasVoted
                ? 'bg-gradient-to-b from-[#22C55E] to-[#15803D] text-white border-b-4 border-[#14532D] cursor-default'
                : selectedCandidateId
                ? 'bg-gradient-to-b from-[#F59E0B] via-[#EA580C] to-[#C2410C] hover:from-[#FBBF24] text-white border-b-4 border-[#9A3412] active:scale-95 cursor-pointer shadow-orange-950/40'
                : 'bg-slate-700/80 border-b-4 border-slate-900 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {hasVoted ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
                <span>PILIHAN TERKUNCI</span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-yellow-200 fill-current" />
                <span>KUNCI PILIHAN</span>
              </>
            )}
          </button>

          <p className="text-[11px] font-bold text-center text-amber-200/80">
            {hasVoted 
              ? 'Menunggu pemain lain menentukan pilihan...' 
              : selectedCandidateId 
              ? 'Klik tombol di atas untuk mengonfirmasi pilihanmu' 
              : 'Pilih satu tersangka di papan terlebih dahulu'}
          </p>
        </div>

      </div>

    </div>
  );
};

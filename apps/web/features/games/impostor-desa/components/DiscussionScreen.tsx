'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ImpostorPublicGameState, 
  ImpostorPrivateRoleData, 
  IMPOSTOR_CATEGORIES 
} from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { Clock, Vote, Send, MessageSquare, AlertCircle, Lock, Volume2, VolumeX } from 'lucide-react';

interface DiscussionScreenProps {
  gameState: ImpostorPublicGameState;
  roleData?: ImpostorPrivateRoleData | null;
  myPlayerId: string;
  isHost: boolean;
  onStartVoting: () => void;
  onSendChat?: (message: string) => void;
}

const QUICK_CHATS = [
  'Petunjuknya aneh!',
  'Bukan aku ya!',
  'Curiga sama siapa nih?',
  'Kok jawabnya pasaran?',
  'Warga asli sini!',
  'Ada yang menyamar!',
  'Ayo jujur siapa impostor?',
];

export const DiscussionScreen: React.FC<DiscussionScreenProps> = ({
  gameState,
  roleData,
  myPlayerId,
  isHost,
  onStartVoting,
  onSendChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const chatMessages = gameState.chatMessages || [];

  // Track who has spoken and how many times ("mana yang berbicara mana yang tidak")
  const speakerStats = useMemo(() => {
    const counts: Record<string, number> = {};
    chatMessages.forEach(m => {
      counts[m.playerId] = (counts[m.playerId] || 0) + 1;
    });
    return counts;
  }, [chatMessages]);

  const recentSpeakerId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].playerId : null;

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const validateMessage = (text: string): { isValid: boolean; forbiddenWord?: string } => {
    const cleanMsg = text.toLowerCase();
    const forbiddenList = new Set<string>();

    // 1. Secret word from private role if known
    if (roleData?.secretWord) {
      forbiddenList.add(roleData.secretWord.toLowerCase());
    }

    // 2. All words in the active category
    const categoryConfig = IMPOSTOR_CATEGORIES[gameState.category];
    if (categoryConfig && categoryConfig.words) {
      categoryConfig.words.forEach(w => {
        if (w.length >= 2) forbiddenList.add(w.toLowerCase());
      });
    }

    // 3. Submitted clues from all players
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

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = chatInput.trim();
    if (!clean || !onSendChat) return;

    // Validation: Block forbidden discussion words
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

  // Timer format (mm:ss)
  const minutes = Math.floor(gameState.phaseTimeRemaining / 60);
  const seconds = gameState.phaseTimeRemaining % 60;
  const formattedTimer = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const allPlayers = Object.values(gameState.players);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-7 max-w-6xl xl:max-w-7xl mx-auto w-full z-10 my-auto">
      
      {/* Top Header: Title & Time Remaining Pill */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🗣️</span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#FCD34D] tracking-tight uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
              FASE DISKUSI WARGA
            </h1>
          </div>
          <p className="text-xs sm:text-sm lg:text-base font-bold text-amber-200/95 mt-0.5">
            Debat 2 menit: Perhatikan siapa yang aktif berbicara dan siapa yang mencurigakan karena diam!
          </p>
        </div>

        {/* Big Discussion Timer Pill */}
        <div className={`shrink-0 flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-2xl font-black text-lg sm:text-xl lg:text-2xl shadow-xl border-2 ${
          gameState.phaseTimeRemaining <= 15
            ? 'bg-gradient-to-r from-red-600 to-rose-700 border-red-400 text-white animate-pulse'
            : 'bg-gradient-to-b from-[#F59E0B] to-[#D97706] border-[#FDE68A] text-[#3E2714]'
        }`}>
          <span className="text-xl sm:text-2xl">⏰</span>
          <span className="tracking-wider font-mono">{formattedTimer}</span>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="w-full bg-[#4E2F16] rounded-3xl p-3 sm:p-4 lg:p-5 shadow-2xl border-4 border-[#6C421E] mb-3">
        <div className="w-full bg-[#FAF4E6] rounded-2xl p-3.5 sm:p-5 lg:p-6 border-2 border-[#D7C29E] shadow-inner text-[#3E2714]">
          
          {/* Status Bar: "Status Suara Warga" (Using avatars to show who is speaking vs silent) */}
          <div className="bg-[#42250F] rounded-2xl p-3 mb-4 border-2 border-[#6B3F1D] shadow-md">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>👥</span> Status Suara Warga Ronde Ini:
              </span>
              <span className="text-[11px] font-bold text-amber-200/80 hidden sm:inline">
                Hijau = Sudah Berbicara • Kuning = Hening / Belum Bicara
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {allPlayers.map((player) => {
                const count = speakerStats[player.id] || 0;
                const hasSpoken = count > 0;
                const isRecent = player.id === recentSpeakerId;
                const isMe = player.id === myPlayerId;

                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border-2 transition-all ${
                      hasSpoken
                        ? 'bg-[#18352B] border-emerald-400 text-white shadow-sm'
                        : 'bg-[#29170A] border-amber-500/40 text-amber-200/70'
                    } ${isRecent ? 'ring-2 ring-emerald-300 animate-pulse' : ''}`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 ${
                        hasSpoken ? 'border-emerald-400 bg-[#0F261C]' : 'border-amber-400/50 bg-[#1A0F06]'
                      }`}>
                        <ChibiAvatar avatar={player.avatar} size="xs" />
                      </div>
                      {hasSpoken && (
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow">
                          💬
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate leading-tight text-white">
                        {player.nickname} {isMe ? '(Kamu)' : ''}
                      </p>
                      {hasSpoken ? (
                        <p className="text-[10px] font-bold text-emerald-300 leading-tight">
                          {count}x Bicara
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-amber-400/90 leading-tight flex items-center gap-0.5">
                          <span>🤫</span> Belum Bicara
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-Column Grid: Clues List on Left (5 cols) & Spacious Chat on Right (7 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            
            {/* Left: Clues List on Parchment (5 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#7A4B23]">
                  Petunjuk Warga Ronde Ini:
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-[#8B5A2B] bg-[#FFF2DE] px-2.5 py-0.5 rounded-full border border-[#D4A359]/40">
                  {gameState.clues.length} petunjuk
                </span>
              </div>

              {/* Clue List scrollable area */}
              <div className="bg-[#FFFDF9] border-2 border-[#D7C29E] rounded-2xl p-3 space-y-2.5 h-[420px] sm:h-[480px] overflow-y-auto shadow-inner pr-2 scrollbar-thin">
                {gameState.clues.map((clueEntry, idx) => {
                  const isMe = clueEntry.playerId === myPlayerId;
                  const count = speakerStats[clueEntry.playerId] || 0;
                  const hasSpoken = count > 0;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-2xl border-2 transition-all shadow-sm ${
                        isMe 
                          ? 'bg-[#E5F5EC] border-[#2F7D55]/60 shadow-md ring-1 ring-[#2F7D55]/30' 
                          : 'bg-[#FAF4E6]/80 border-[#E5D7BE] hover:bg-[#FAF4E6]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar Frame with speaking ring */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border-2 ${
                          hasSpoken ? 'bg-[#18352B] border-emerald-500' : 'bg-[#4E2F16] border-amber-300'
                        }`}>
                          <ChibiAvatar avatar={clueEntry.avatar} size="sm" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-black text-[#3E2714] truncate">
                              {clueEntry.nickname}
                            </span>
                            {isMe && (
                              <span className="text-[10px] text-emerald-800 bg-emerald-200 px-1.5 py-0.2 rounded-full font-bold">
                                Kamu
                              </span>
                            )}
                          </div>
                          
                          {/* Speaking status indicator badge */}
                          <div className="mt-0.5">
                            {hasSpoken ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-md">
                                💬 Aktif ({count}x)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                🤫 Hening
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Clue Word Badge */}
                      <div className="bg-[#FFF8E8] border-2 border-[#F2A444] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm shrink-0">
                        <span className="text-sm sm:text-base font-black text-[#A8481A] tracking-wide">
                          &ldquo;{clueEntry.clue}&rdquo;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Enlarged & Spacious Live Chat with Avatars (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col justify-between h-[420px] sm:h-[480px] bg-[#142D24] rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-[#2F7D55] text-white">
              
              {/* Chat Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/15 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-[#18352B] flex items-center justify-center font-black shadow-sm">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 block">
                      Obrolan Diskusi Langsung
                    </span>
                    <span className="text-[10px] text-emerald-300 font-semibold block">
                      Perhatikan avatar pembicara untuk melacak perdebatan
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-black text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Diskusi
                </span>
              </div>

              {/* Message Log (Spacious, Large Text & Chibi Avatars) */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 my-3 scrollbar-thin">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-black/20 rounded-xl border border-white/10">
                    <span className="text-3xl mb-2">🌾</span>
                    <p className="text-sm sm:text-base font-black text-amber-200">
                      Belum ada obrolan!
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-white/60 mt-1 max-w-sm">
                      Mulai perdebatan dengan mengetik atau memilih pesan cepat di bawah untuk membongkar siapa yang menyamar!
                    </p>
                  </div>
                ) : (
                  chatMessages.slice(-25).map((msg) => {
                    const isMe = msg.playerId === myPlayerId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Other player's avatar on left */}
                        {!isMe && (
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#3D2512] border-2 border-amber-400 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                            <ChibiAvatar avatar={msg.avatar} size="xs" />
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[82%] sm:max-w-[78%] ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* Nickname header */}
                          <span className={`text-[11px] sm:text-xs font-black mb-1 ${
                            isMe ? 'text-emerald-300 mr-1' : 'text-amber-300 ml-1'
                          }`}>
                            {isMe ? `Kamu (${msg.nickname})` : msg.nickname}
                          </span>

                          {/* Large spacious speech bubble */}
                          <div className={`px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-sm sm:text-base font-bold shadow-md leading-relaxed ${
                            isMe 
                              ? 'bg-[#15803D] text-white rounded-tr-none border border-emerald-400/40 shadow-emerald-950/40' 
                              : 'bg-white text-[#18352B] rounded-tl-none border border-slate-200 shadow-black/20'
                          }`}>
                            {msg.message}
                          </div>
                        </div>

                        {/* Current player's avatar on right */}
                        {isMe && (
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#18352B] border-2 border-emerald-400 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                            <ChibiAvatar avatar={msg.avatar} size="xs" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick-Chats & Input Form */}
              <div className="space-y-2 pt-2 border-t border-white/15 shrink-0">
                {/* Warning Alert if player tried to send forbidden words */}
                {chatError && (
                  <div className="flex items-center gap-1.5 bg-rose-500/30 border border-rose-400 px-3 py-1.5 rounded-xl text-rose-200 text-xs sm:text-sm font-bold animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                    <span>{chatError}</span>
                  </div>
                )}

                {/* Policy Notice Pill */}
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-200/90 bg-black/40 px-3 py-1 rounded-xl border border-white/10">
                  <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Dilarang membocorkan kata rahasia atau kata terkait dalam diskusi!</span>
                </div>

                {/* Quick-Chat Suggestions */}
                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
                  {QUICK_CHATS.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleQuickChat(phrase)}
                      className="bg-white/10 hover:bg-white/20 active:scale-95 text-amber-200 border border-white/20 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={70}
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value);
                      if (chatError) setChatError('');
                    }}
                    placeholder="Ketik tuduhan / pendapatmu di sini..."
                    className="flex-1 bg-black/40 border-2 border-white/30 rounded-xl px-4 py-3 text-sm sm:text-base text-white font-medium placeholder-white/40 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-5 py-3 bg-[#2F7D55] hover:bg-[#3ca971] disabled:opacity-40 text-white rounded-xl text-sm sm:text-base font-black flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim</span>
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* Bottom Action: Proceed to Voting */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
        <p className="text-xs sm:text-sm font-bold text-amber-200/90 text-center sm:text-left">
          Setelah waktu diskusi 2 menit berakhir, semua warga akan langsung memberikan suara rahasia.
        </p>

        <button
          type="button"
          onClick={onStartVoting}
          className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-b from-[#F59E0B] via-[#EA580C] to-[#C2410C] hover:from-[#FBBF24] text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-xl border-b-4 border-[#9A3412] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Vote className="w-5 h-5" />
          <span>{isHost ? 'Mulai Voting Sekarang' : 'Siap Voting'}</span>
        </button>
      </div>

    </div>
  );
};

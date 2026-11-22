'use client';

import React, { useState } from 'react';
import { useGameStore } from '../../../../stores/useGameStore';
import { useSettingsStore } from '../../../../stores/useSettingsStore';
import { 
  IMPOSTOR_CATEGORIES, 
  IMPOSTOR_PLAYER_LIMITS, 
  ImpostorCategory 
} from '@gamehouse/shared';
import { ChibiAvatar } from './ChibiAvatar';
import { VillageBackground } from './VillageBackground';
import { AvatarSelector } from '../../../../components/ui/AvatarSelector';
import { Modal } from '../../../../components/ui/Modal';
import { 
  Users, 
  Crown, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Share2, 
  Play, 
  LogOut, 
  UserX, 
  Sparkles,
  Volume2,
  VolumeX,
  Smile,
  Bot,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export const ImpostorLobbyScreen: React.FC = () => {
  const router = useRouter();
  const { socket, room, playerId, addToast } = useGameStore();
  const { isMuted, toggleMute, avatar, setAvatar } = useSettingsStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  if (!room) return null;

  const myPlayer = room.players.find(
    p => (socket?.id && p.socketId === socket.id) || (playerId && p.id === playerId)
  );

  const isHost = Boolean(
    myPlayer?.isHost || 
    (myPlayer && room.hostId === myPlayer.id) || 
    room.hostId === playerId
  );

  const minPlayers = IMPOSTOR_PLAYER_LIMITS.minPlayers; // 4
  const maxPlayers = IMPOSTOR_PLAYER_LIMITS.maxPlayers; // 6

  const botsInRoom = room.players.filter(p => p.isBot);
  const hasBots = botsInRoom.length > 0;
  const botCount = botsInRoom.length;

  const nonHostPlayers = room.players.filter(p => !p.isHost && p.id !== room.hostId && !p.isBot);
  const allReady = nonHostPlayers.length === 0 ? true : nonHostPlayers.every(p => p.isReady);
  const canStart = isHost && room.players.length >= minPlayers && room.players.length <= maxPlayers && allReady;

  // Selected categories (defaults to all categories if not specified)
  const allCategoryKeys = Object.keys(IMPOSTOR_CATEGORIES) as ImpostorCategory[];
  const selectedCategories: ImpostorCategory[] = 
    (room.settings.impostorCategories && room.settings.impostorCategories.length > 0)
      ? room.settings.impostorCategories
      : allCategoryKeys;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    addToast('Kode room disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    addToast('Link undangan disalin! Bagikan ke temanmu!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleReady = () => {
    if (socket && !isHost) {
      socket.emit('room:ready', !myPlayer?.isReady);
    }
  };

  const handleToggleCategory = (catId: ImpostorCategory) => {
    if (!socket || !isHost) return;

    let updated: ImpostorCategory[];
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) {
        addToast('Minimal harus ada 1 kategori yang aktif!', 'info');
        return;
      }
      updated = selectedCategories.filter(c => c !== catId);
    } else {
      updated = [...selectedCategories, catId];
    }

    socket.emit('room:update-settings', { impostorCategories: updated });
  };

  const handleKickPlayer = (targetPlayerId: string) => {
    if (socket && isHost) {
      socket.emit('room:kick-player', targetPlayerId);
      addToast('Pemain dikeluarkan dari room.', 'info');
    }
  };

  // Bot Practice Mode Actions
  const handleAddBot = () => {
    if (socket && isHost) {
      socket.emit('room:add-bot');
      addToast('Bot warga bergabung ke room.', 'info');
    }
  };

  const handleFillBots = () => {
    if (socket && isHost) {
      socket.emit('room:fill-bots');
      addToast('Slot terisi dengan Bot Warga! Siap bermain latihan.', 'success');
    }
  };

  const handleRemoveBot = (botId?: string) => {
    if (socket && isHost) {
      socket.emit('room:remove-bot', { botId });
      addToast('Bot dikeluarkan dari room.', 'info');
    }
  };

  const handleClearBots = () => {
    if (socket && isHost) {
      socket.emit('room:clear-bots');
      addToast('Semua bot telah dikeluarkan.', 'info');
    }
  };

  const handleStartGame = () => {
    if (!canStart) return;
    if (socket && isHost) {
      socket.emit('game:start');
    }
  };

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('room:leave');
    }
    router.push('/');
  };

  // Generate slots up to maxPlayers (6)
  const slots = Array.from({ length: maxPlayers }).map((_, index) => {
    return room.players[index] || null;
  });

  return (
    <VillageBackground>
      {/* Top Bar Header */}
      <header className="w-full bg-[#18352B] text-white px-4 py-2.5 flex items-center justify-between shadow-md z-20 border-b border-[#2F7D55]/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => router.push('/')}>
            <span className="text-xl">🎮</span>
            <span className="font-black text-sm tracking-wider uppercase text-amber-300">
              GAMEHOUSE
            </span>
          </div>
          <span className="text-white/30 hidden sm:inline">|</span>
          <div className="hidden sm:inline-flex items-center gap-1.5 bg-[#2F7D55]/80 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider text-white">
            <span>🌾 IMPOSTOR DESA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
          </button>

          {/* Avatar selector modal button */}
          <button
            onClick={() => setIsAvatarModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-200 transition-colors"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Ganti Avatar</span>
          </button>

          {/* Leave button */}
          <button
            onClick={handleLeaveRoom}
            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors"
            title="Keluar Room"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Parchment Board Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 w-full max-w-5xl mx-auto z-10">
        {/* Wooden Frame Outer Board */}
        <div className="w-full bg-[#442912] rounded-3xl p-2.5 sm:p-3.5 shadow-2xl border-4 border-[#6C421E]">
          {/* Inner Parchment Notice Board */}
          <div className="w-full bg-[#FAF4E6] rounded-2xl p-4 sm:p-6 border-2 border-[#D7C29E] shadow-inner text-[#3E2714]">
            
            {/* Header: Title & Info Pills */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b-2 border-[#E5D7BE] gap-3 mb-4">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#442912] tracking-tight uppercase drop-shadow-sm">
                  LOBBY DESA
                </h1>
                <p className="text-xs sm:text-sm font-bold text-[#7A4B23]">
                  Kumpulkan 4 hingga 6 warga untuk mengungkap sang impostor!
                </p>
              </div>

              {/* Room Code & Player Count Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Room Code Pill */}
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-2 bg-[#FFF8EB] hover:bg-[#FFECC9] border-2 border-[#D4A359] px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm text-[#442912] shadow-sm transition-all active:scale-95"
                  title="Klik untuk salin kode"
                >
                  <span className="text-[#8B5A2B] text-xs font-bold uppercase">Kode room:</span>
                  <span className="tracking-widest font-mono text-base font-black text-[#A8481A]">
                    {room.code}
                  </span>
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#8B5A2B]" />
                  )}
                </button>

                {/* Player Count Pill */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm border-2 shadow-sm ${
                  room.players.length >= minPlayers
                    ? 'bg-[#E5F5EC] border-[#2F7D55] text-[#1E5738]'
                    : 'bg-[#FFF2DE] border-[#D4A359] text-[#7A4B23]'
                }`}>
                  <Users className="w-4 h-4" />
                  <span>PEMAIN ({room.players.length}/{maxPlayers})</span>
                </div>
              </div>
            </div>

            {/* Mode Latihan / Practice Mode Banner Bar */}
            <div className="bg-gradient-to-r from-[#FFF8EB] to-[#FFF3DC] border-2 border-[#D4A359] rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs mb-4">
              <div className="flex items-center gap-2.5 text-center sm:text-left">
                <div className="w-9 h-9 rounded-xl bg-[#2F7D55] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <p className="font-black text-xs sm:text-sm text-[#442912]">
                      Mode Latihan (Bermain Sendiri dengan Bot)
                    </p>
                    {hasBots && (
                      <span className="bg-[#2F7D55] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                        Aktif ({botCount} Bot)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#7A4B23] mt-0.5">
                    {hasBots
                      ? 'Slot telah diisi oleh Bot Warga Desa. Tekan MULAI GAME untuk langsung bermain!'
                      : 'Sedang sendiri? Isi slot kosong dengan Bot cerdas untuk latihan tanpa menunggu teman!'}
                  </p>
                </div>
              </div>

              {isHost && (
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={handleFillBots}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#2F7D55] hover:bg-[#256846] active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>{hasBots ? '+ Tambah Bot' : 'Isi Bot Otomatis'}</span>
                  </button>

                  {hasBots && (
                    <button
                      type="button"
                      onClick={handleClearBots}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-300 transition-colors cursor-pointer"
                      title="Keluarkan semua bot"
                    >
                      Hapus Bot
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Main Content Grid: Players (Left) & Categories (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
              
              {/* Left Column: Player Slots (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#7A4B23]">
                    Warga Desa Terdaftar (Slot 4 - 6)
                  </h2>
                  <span className="text-[11px] font-bold text-[#8B5A2B]/80">
                    Min 4 pemain
                  </span>
                </div>

                {/* Wooden Plank Player Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {slots.map((player, idx) => {
                    if (player) {
                      const isMe = player.id === playerId || player.socketId === socket?.id;
                      const isPlayerHost = player.isHost || player.id === room.hostId;
                      const isBot = Boolean(player.isBot);

                      return (
                        <div
                          key={player.id}
                          className={`relative flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 transition-all shadow-sm select-none h-[74px] ${
                            isMe
                              ? 'bg-gradient-to-r from-[#5E3416] to-[#4D2A10] border-amber-400 text-white shadow-md ring-2 ring-amber-400/25'
                              : isBot
                              ? 'bg-gradient-to-r from-[#4A2D17] to-[#3D2311] border-[#7D4C25] text-amber-50'
                              : 'bg-gradient-to-r from-[#4A2D17] to-[#3D2311] border-[#7D4C25] text-amber-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                            {/* Avatar Badge with Host Crown */}
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-full bg-[#2E1808] border-2 border-amber-300/80 flex items-center justify-center overflow-hidden shadow-inner">
                                <ChibiAvatar avatar={player.avatar || 'budi'} size="xs" />
                              </div>
                              {isPlayerHost && (
                                <span className="absolute -top-1.5 -left-1 text-xs select-none" title="Tuan Rumah (Host)">
                                  👑
                                </span>
                              )}
                            </div>

                            {/* Name & Subtitle without truncate on parent */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 leading-tight">
                                <span className="font-black text-xs sm:text-sm text-white truncate max-w-[95px] sm:max-w-[115px]">
                                  {player.nickname}
                                </span>
                                {isMe && (
                                  <span className="shrink-0 bg-amber-400 text-[#442912] text-[9px] font-black px-1.5 py-0.2 rounded">
                                    Kamu
                                  </span>
                                )}
                                {isBot && (
                                  <span className="shrink-0 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    <Bot className="w-2.5 h-2.5" />
                                    <span>BOT</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-200/80 mt-1 leading-none">
                                <span className="truncate">
                                  {isPlayerHost 
                                    ? 'Kepala Desa' 
                                    : isBot 
                                    ? 'Bot Warga' 
                                    : 'Warga Desa'}
                                </span>
                                {typeof (player as any).score === 'number' && (player as any).score > 0 && (
                                  <span className="shrink-0 bg-amber-400/25 border border-amber-400/50 text-amber-300 px-1.5 py-0.2 rounded font-black text-[9px]">
                                    ⭐ {(player as any).score} Poin
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge & Kick/Remove action */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPlayerHost ? (
                              <span className="bg-amber-400 text-[#3E2714] font-black text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <Crown className="w-3 h-3 text-[#3E2714]" />
                                <span>Host</span>
                              </span>
                            ) : isBot ? (
                              <span className="bg-emerald-600 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>Siap</span>
                              </span>
                            ) : player.isReady ? (
                              <span className="bg-emerald-500 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>Siap</span>
                              </span>
                            ) : (
                              <span className="bg-white/20 text-white/80 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Tunggu</span>
                              </span>
                            )}

                            {/* Host Kick Option for human or Bot Remove */}
                            {isHost && !isMe && !isPlayerHost && (
                              <button
                                type="button"
                                onClick={() => isBot ? handleRemoveBot(player.id) : handleKickPlayer(player.id)}
                                className="w-6 h-6 rounded-lg hover:bg-rose-600/40 text-rose-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title={isBot ? 'Keluarkan bot' : 'Keluarkan pemain'}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Empty Slot placeholder
                    const slotRequired = idx < minPlayers;
                    return (
                      <div
                        key={`empty-${idx}`}
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 border-dashed select-none transition-all h-[74px] ${
                          slotRequired
                            ? 'bg-[#EFE5D0]/60 border-[#C4AA83] text-[#8C6B46]'
                            : 'bg-[#F5EDE0]/40 border-[#D9C4A6] text-[#A68967]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#B89B73] flex items-center justify-center text-xs opacity-50 shrink-0">
                            👤
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#5C3D24]">
                              Slot Pemain {idx + 1}
                            </p>
                            <p className="text-[10px] text-[#8C6B46]">
                              {slotRequired ? 'Wajib (Min 4)' : 'Opsional (Hingga 6)'}
                            </p>
                          </div>
                        </div>

                        {/* Host quick button to add bot into empty slot */}
                        {isHost ? (
                          <button
                            type="button"
                            onClick={handleAddBot}
                            className="text-[10px] font-black uppercase tracking-wider bg-[#2F7D55] hover:bg-[#256846] text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Tambah bot ke slot ini"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Bot</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-[#DECBAF] px-2 py-0.5 rounded-md text-[#5E4225]">
                            Kosong
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Category Selection Cards (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#7A4B23]">
                    Kategori Kata Rahasia
                  </h2>
                  {isHost ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Klik untuk memilih
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#8B5A2B]/80">
                      Ditentukan oleh Host
                    </span>
                  )}
                </div>

                {/* Category Cards List */}
                <div className="flex flex-col gap-2 max-h-[340px] sm:max-h-[380px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {allCategoryKeys.map((catKey) => {
                    const cat = IMPOSTOR_CATEGORIES[catKey];
                    const isSelected = selectedCategories.includes(catKey);

                    return (
                      <button
                        key={catKey}
                        type="button"
                        disabled={!isHost}
                        onClick={() => handleToggleCategory(catKey)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all text-left select-none ${
                          isSelected
                            ? 'bg-[#FFF8EB] border-[#D4A359] shadow-sm ring-1 ring-[#D4A359]/30'
                            : 'bg-white/60 border-slate-200/80 opacity-60 hover:opacity-90'
                        } ${isHost ? 'cursor-pointer active:scale-99' : 'cursor-default'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl p-1 bg-white rounded-lg border border-amber-200 shadow-xs">
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="font-black text-xs sm:text-sm text-[#442912] flex items-center gap-1.5">
                              <span>{cat.name}</span>
                              <span className="text-[10px] font-bold text-[#8B5A2B] bg-amber-100/80 px-1.5 py-0.2 rounded">
                                {cat.badge}
                              </span>
                            </p>
                            <p className="text-[10px] font-semibold text-[#7A4B23]/80 truncate">
                              Contoh: {cat.words.slice(0, 4).join(', ')}... ({cat.words.length} kata)
                            </p>
                          </div>
                        </div>

                        {/* Selected Checkmark Indicator */}
                        <div className="shrink-0 ml-2">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-[#2F7D55] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Status & Action Bar */}
            <div className="pt-4 border-t-2 border-[#E5D7BE] flex flex-col sm:flex-row items-center justify-between gap-3">
              
              {/* Ready Status / Requirement Notice */}
              <div className="text-center sm:text-left">
                {room.players.length < minPlayers ? (
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5 justify-center sm:justify-start">
                    <span>⚠️</span>
                    <span>
                      Butuh minimal {minPlayers} pemain! (Klik &ldquo;Isi Bot Otomatis&rdquo; di atas untuk main sendiri).
                    </span>
                  </p>
                ) : !allReady ? (
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Menunggu semua pemain mengklik Siap...</span>
                  </p>
                ) : (
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {hasBots 
                        ? 'Mode latihan siap! Tekan MULAI GAME untuk bermain.' 
                        : 'Semua warga siap! Siap mengungkap impostor.'}
                    </span>
                  </p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {/* Invite Link Button */}
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#FFF8EB] border-2 border-[#D7C29E] text-xs font-black text-[#5C3D24] shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Bagikan link ke teman"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Undang Teman</span>
                </button>

                {/* Host Start OR Player Ready Button */}
                {isHost ? (
                  <button
                    type="button"
                    disabled={!canStart}
                    onClick={handleStartGame}
                    className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all ${
                      canStart
                        ? 'bg-gradient-to-b from-[#349463] to-[#246945] hover:from-[#3ca971] hover:to-[#2b7b51] text-white active:scale-95 cursor-pointer shadow-emerald-900/20'
                        : 'bg-slate-300 border border-slate-400/50 text-slate-500 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>MULAI GAME</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleToggleReady}
                    className={`flex-1 sm:flex-initial px-6 py-3 rounded-2xl font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                      myPlayer?.isReady
                        ? 'bg-[#E46B5D] hover:bg-[#d45b4d] text-white shadow-rose-900/20'
                        : 'bg-gradient-to-b from-[#349463] to-[#246945] hover:from-[#3ca971] text-white shadow-emerald-900/20'
                    }`}
                  >
                    {myPlayer?.isReady ? (
                      <>
                        <span>BATAL SIAP ✕</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>SAYA SIAP!</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Avatar Selection Modal */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Pilih Karakter Warga"
      >
        <div className="p-4">
          <AvatarSelector selected={avatar} onSelect={setAvatar} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setIsAvatarModalOpen(false)}
              className="px-4 py-2 bg-[#2F7D55] text-white rounded-xl font-bold text-xs hover:bg-[#256846]"
            >
              Simpan Pilihan
            </button>
          </div>
        </div>
      </Modal>
    </VillageBackground>
  );
};

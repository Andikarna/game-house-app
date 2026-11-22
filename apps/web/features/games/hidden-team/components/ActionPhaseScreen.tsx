'use client';

import React, { useState } from 'react';
import {
  HiddenTeamPublicGameState,
  HiddenTeamPlayerPrivate,
  HiddenTeamActionPayload,
  HIDDEN_TEAM_ROLES_INFO,
} from '@gamehouse/shared';
import {
  Clock,
  Zap,
  Shuffle,
  Repeat,
  Sparkles,
  Eye,
  Crown,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { ClimberAvatarIcon } from '../../../../components/ui/AvatarSelector';
import { CornerFiligree } from './HiddenTeamIllustrations';
import { ActiveMainCardBanner } from './ActiveMainCardBanner';

interface ActionPhaseScreenProps {
  state: HiddenTeamPublicGameState;
  privateState: HiddenTeamPlayerPrivate | null;
  myPlayerId: string;
  onExecuteAction: (payload: HiddenTeamActionPayload) => void;
}

export const ActionPhaseScreen: React.FC<ActionPhaseScreenProps> = ({
  state,
  privateState,
  myPlayerId,
  onExecuteAction,
}) => {
  const currentSlot = state.currentTurnSlot;
  const currentSlotPlayerId = state.playerSlots[currentSlot - 1];
  const isMySlotTurn = currentSlotPlayerId === myPlayerId;
  const currentSlotPlayer = state.players[currentSlotPlayerId];

  const currentRole = privateState?.currentRole;
  const roleInfo = currentRole ? HIDDEN_TEAM_ROLES_INFO[currentRole] : null;

  // Active Main Card
  const activeMainCard = state.activeMainCard;

  // Players list
  const otherPlayers = Object.values(state.players).filter((p) => p.id !== myPlayerId);
  const allPlayers = Object.values(state.players);

  // Role 1 targets
  const [role1TargetA, setRole1TargetA] = useState<string>(myPlayerId);
  const [role1TargetB, setRole1TargetB] = useState<string>(otherPlayers[0]?.id || '');

  // Role 3 target
  const [role3Target, setRole3Target] = useState<string>(allPlayers[0]?.id || '');

  // Role 6 targets
  const [role6TargetA, setRole6TargetA] = useState<string>(myPlayerId);
  const [role6TargetB, setRole6TargetB] = useState<string>(otherPlayers[0]?.id || '');

  const handleExecuteRole1 = () => {
    if (role1TargetA === role1TargetB) return;
    onExecuteAction({
      action: 'role_1_swap',
      targetPlayerIdA: role1TargetA,
      targetPlayerIdB: role1TargetB,
    });
  };

  const handleExecuteRole2 = () => {
    onExecuteAction({ action: 'role_2_roll' });
  };

  const handleExecuteRole3 = () => {
    if (!role3Target) return;
    onExecuteAction({
      action: 'role_3_multiply',
      targetPlayerId: role3Target,
    });
  };

  const handleExecuteRole6 = () => {
    if (role6TargetA === role6TargetB) return;
    onExecuteAction({
      action: 'role_6_swap_cards',
      targetPlayerIdA: role6TargetA,
      targetPlayerIdB: role6TargetB,
    });
  };

  const handlePass = () => {
    onExecuteAction({ action: 'pass' });
  };

  // Custom Player Selector with Avatar
  const renderPlayerSelect = (
    label: string,
    value: string,
    onChange: (val: string) => void
  ) => {
    const selected = allPlayers.find((p) => p.id === value) || allPlayers[0];

    return (
      <div className="flex-1 min-w-[200px]">
        <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
          {label}
        </label>
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 bg-[#141b29] border border-slate-700/80 rounded-xl text-white text-xs font-extrabold appearance-none focus:outline-none focus:border-indigo-400 cursor-pointer shadow-inner truncate"
          >
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900 text-white font-bold py-1">
                {p.nickname} (Slot #{p.slotNumber}) {p.id === myPlayerId ? '• Anda' : ''}
              </option>
            ))}
          </select>
          {/* Avatar Icon */}
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <ClimberAvatarIcon avatar={selected?.avatar || 'budi'} size={24} />
          </div>
          {/* Chevron */}
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-5xl mx-auto w-full">
      {/* 1. Active Main Card Showcase (Stone Masonry Banner) */}
      <ActiveMainCardBanner card={activeMainCard} />

      {/* 2. Phase 4 - Turn Status Indicator (Matches User Design) */}
      <div className="text-center my-4 sm:my-5">
        {/* Phase Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#1e1b4b]/80 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider mb-2 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>FASE 4 — GILIRAN AKSI SLOT (SLOT 1 S/D 6)</span>
        </div>

        {/* Big Slot #1: JagoHero76 Title */}
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2 drop-shadow-md">
          <span>Slot #{currentSlot}:</span>
          <span className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
            {currentSlotPlayer?.nickname || `Player ${currentSlot}`}
          </span>
        </h2>

        {/* Countdown Timer Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-400 text-xs font-extrabold mt-2 shadow-md">
          <Clock className="w-3.5 h-3.5" />
          <span>{state.phaseTimer}s tersisa</span>
        </div>
      </div>

      {/* 3. Interactive Ornate Ability Card Box */}
      {isMySlotTurn && roleInfo ? (
        <div className="w-full bg-gradient-to-b from-[#181d29] via-[#131722] to-[#0c0f17] border-2 border-[#334155] rounded-3xl p-5 sm:p-8 shadow-[0_15px_45px_rgba(0,0,0,0.9)] relative overflow-visible">
          {/* Ornate Gold Filigree Corners with Sapphire Gems (All 4 Corners) */}
          <CornerFiligree position="top-left" className="absolute -top-1.5 -left-1.5 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none z-20" />
          <CornerFiligree position="top-right" className="absolute -top-1.5 -right-1.5 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none z-20" />
          <CornerFiligree position="bottom-left" className="absolute -bottom-1.5 -left-1.5 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none z-20" />
          <CornerFiligree position="bottom-right" className="absolute -bottom-1.5 -right-1.5 w-8 h-8 sm:w-10 sm:h-10 pointer-events-none z-20" />

          {/* Card Header */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-3.5">
            <div className="flex items-center gap-3">
              <span className="text-xl sm:text-2xl text-amber-400">✨</span>
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 block">
                  GILIRAN SLOT ANDA - ROLE #{roleInfo.number}
                </span>
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-snug">
                  {roleInfo.name}
                </h3>
              </div>
            </div>

            {/* Badge pill */}
            <span className="text-xs font-black px-3 py-1 rounded-xl bg-gradient-to-r from-red-950/80 to-purple-950/80 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1">
              <span>🎴</span>
              <span>{roleInfo.badge}</span>
            </span>
          </div>

          {/* Ability Description */}
          <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
            {roleInfo.description}
          </p>

          {/* ================= Role 6 Action Form (Matches User Reference Image) ================= */}
          {currentRole === 'ROLE_6_CARD_SWAPPER' && (
            <div className="space-y-4 mb-6 bg-[#0f1420] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-inner">
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-300">
                PILIH 2 PEMAIN UNTUK SALING TUKAR SELURUH 3 KARTU MANDAT:
              </h4>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                {renderPlayerSelect('Pemain A:', role6TargetA, setRole6TargetA)}
                {renderPlayerSelect('Pemain B:', role6TargetB, setRole6TargetB)}
              </div>

              {role6TargetA === role6TargetB && (
                <p className="text-[11px] text-rose-400 font-bold">
                  Pemain A dan Pemain B harus berbeda!
                </p>
              )}

              {/* Radiant Red Action Button */}
              <button
                type="button"
                disabled={role6TargetA === role6TargetB}
                onClick={handleExecuteRole6}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm tracking-wide shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Repeat className="w-4 h-4" />
                <span>Tukar Seluruh 3 Kartu Mandat Sekarang</span>
              </button>
            </div>
          )}

          {/* Role 1 Form */}
          {currentRole === 'ROLE_1_SWAPPER' && (
            <div className="space-y-4 mb-6 bg-[#0f1420] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-inner">
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-purple-300">
                PILIH 2 PEMAIN YANG AKAN DITUKAR ROLE ABILITY-NYA:
              </h4>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {renderPlayerSelect('Pemain A:', role1TargetA, setRole1TargetA)}
                {renderPlayerSelect('Pemain B:', role1TargetB, setRole1TargetB)}
              </div>
              {role1TargetA === role1TargetB && (
                <p className="text-[11px] text-rose-400 font-bold">
                  Pemain A dan Pemain B harus berbeda!
                </p>
              )}
              <button
                type="button"
                disabled={role1TargetA === role1TargetB}
                onClick={handleExecuteRole1}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm tracking-wide shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
                <span>Tukar Ability Peran Sekarang</span>
              </button>
            </div>
          )}

          {/* Role 2 Form */}
          {currentRole === 'ROLE_2_ROLLER' && (
            <div className="space-y-4 mb-6 bg-[#0f1420] p-4 sm:p-5 rounded-2xl border border-slate-800 text-center">
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-emerald-300">
                UNDIAN HAK SUARA RONDE INI:
              </h4>
              <div className="py-2">
                <span
                  className={`text-lg sm:text-xl font-black px-4 py-2 rounded-xl border ${
                    privateState?.role2CanVote
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {privateState?.role2CanVote ? '✅ BISA VOTE' : '❌ TIDAK BISA VOTE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hasil undian telah ditentukan oleh server secara rahasia untuk ronde ini.
              </p>
            </div>
          )}

          {/* Role 3 Form */}
          {currentRole === 'ROLE_3_MULTIPLIER' && (
            <div className="space-y-4 mb-6 bg-[#0f1420] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-inner">
              <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                PILIH PEMAIN TARGET UNTUK DIBERI BONUS +1 SUARA TIAP KARTU:
              </h4>
              <div>
                {renderPlayerSelect('Pemain Target:', role3Target, setRole3Target)}
              </div>
              <button
                type="button"
                onClick={handleExecuteRole3}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm tracking-wide shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2 transform active:scale-98 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Terapkan Bonus Suara ke Target</span>
              </button>
            </div>
          )}

          {/* Role 4 Form */}
          {currentRole === 'ROLE_4_INSPECTOR' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1420] border border-slate-800 text-center mb-6">
              <Eye className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <h4 className="text-sm font-black text-pink-300 mb-1">
                Vote Inspector Aktif Setelah Voting Selesai
              </h4>
              <p className="text-xs text-slate-400">
                Peran Anda akan memilih KEEP atau DISCARD pada 1 kartu acak yang diserahkan nanti di Fase Manipulasi Suara.
              </p>
            </div>
          )}

          {/* Role 5 Form */}
          {currentRole === 'ROLE_5_SELECTOR' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1420] border border-slate-800 text-center mb-6">
              <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h4 className="text-sm font-black text-amber-300 mb-1">
                Kartu Takdir Sudah Ditetapkan
              </h4>
              <p className="text-xs text-slate-400">
                Anda telah memilih Kartu Utama di awal ronde. Anda dapat melanjutkan ke giliran berikutnya.
              </p>
            </div>
          )}

          {/* Footer: Lewati / Selesai Giliran Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handlePass}
              className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Lewati / Selesai Giliran</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Waiting Card for Other Slot Turns */
        <div className="w-full max-w-md p-6 sm:p-8 bg-[#131722]/90 border border-slate-800 rounded-3xl text-center shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-3xl mx-auto mb-4 animate-pulse">
            ⏳
          </div>
          <h4 className="text-base font-black text-white mb-2">
            Giliran Slot #{currentSlot}: {currentSlotPlayer?.nickname || `Player ${currentSlot}`}
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Pemain pada slot ini sedang mempertimbangkan aksi perannya. Urutan giliran berjalan tetap dari Slot 1 hingga 6.
          </p>
          <div className="mt-5 flex justify-center items-center gap-1.5 text-xs text-amber-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Menunggu penyelesaian aksi slot #{currentSlot}...</span>
          </div>
        </div>
      )}
    </div>
  );
};

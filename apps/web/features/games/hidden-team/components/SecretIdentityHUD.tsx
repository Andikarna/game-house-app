'use client';

import React, { useState } from 'react';
import {
  HiddenTeamPlayerPrivate,
  HIDDEN_TEAM_ROLES_INFO,
  HiddenTeamFaction,
} from '@gamehouse/shared';
import {
  Eye,
  EyeOff,
  Lock,
  Swords,
  Package,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  CrownedLionIllustration,
  ImperialEagleIllustration,
  NeutralScalesIllustration,
  RoleIllustration,
  VoteCardsFanIllustration,
} from './HiddenTeamIllustrations';

interface SecretIdentityHUDProps {
  privateState: HiddenTeamPlayerPrivate | null;
}

export const SecretIdentityHUD: React.FC<SecretIdentityHUDProps> = ({ privateState }) => {
  const [isRevealed, setIsRevealed] = useState(true);

  if (!privateState) return null;

  const roleInfo = HIDDEN_TEAM_ROLES_INFO[privateState.currentRole];
  const team = privateState.team;

  const teamMeta: Record<
    HiddenTeamFaction,
    {
      name: string;
      color: string;
      border: string;
      bg: string;
      glow: string;
      illustration: React.ReactNode;
    }
  > = {
    RED: {
      name: 'RED TEAM',
      color: 'text-red-500',
      border: 'border-red-500/80',
      bg: 'from-[#1e0d13] via-[#150a0f] to-[#0d070b]',
      glow: 'shadow-[0_0_25px_rgba(239,68,68,0.25)]',
      illustration: <CrownedLionIllustration className="w-24 h-24 mx-auto my-0.5 filter drop-shadow-[0_6px_14px_rgba(239,68,68,0.4)]" />,
    },
    BLUE: {
      name: 'BLUE TEAM',
      color: 'text-sky-400',
      border: 'border-sky-500/80',
      bg: 'from-[#0c1f36] via-[#091526] to-[#060e1a]',
      glow: 'shadow-[0_0_25px_rgba(14,165,233,0.25)]',
      illustration: <ImperialEagleIllustration className="w-24 h-24 mx-auto my-0.5 filter drop-shadow-[0_6px_14px_rgba(14,165,233,0.4)]" />,
    },
    NEUTRAL: {
      name: 'NEUTRAL TEAM',
      color: 'text-amber-300',
      border: 'border-amber-500/70',
      bg: 'from-[#221c10] via-[#17130b] to-[#0c0a06]',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.25)]',
      illustration: <NeutralScalesIllustration className="w-24 h-24 mx-auto my-0.5 filter drop-shadow-[0_6px_14px_rgba(245,158,11,0.4)]" />,
    },
  };

  const currentTeam = teamMeta[team];

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 my-3">
      {/* Top Confidential Bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
            INFORMASI RAHASIA ANDA (CONFIDENTIAL)
          </span>
        </div>

        <button
          onClick={() => setIsRevealed(!isRevealed)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700/80 transition-colors shadow-md cursor-pointer"
        >
          {isRevealed ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Sembunyikan</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Buka Rahasia</span>
            </>
          )}
        </button>
      </div>

      {/* 3 Confidential Cards Grid (Matches User Reference Image) */}
      {isRevealed ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* ================= CARD 1: KARTU TIM RAHASIA ================= */}
          <div
            className={`rounded-2xl sm:rounded-3xl border-2 ${currentTeam.border} bg-gradient-to-b ${currentTeam.bg} ${currentTeam.glow} p-4 sm:p-5 flex flex-col justify-between transition-all`}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                <span>KARTU TIM RAHASIA</span>
                <Swords className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* Majestic Crowned Lion / Team Emblem */}
              <div className="py-1 flex items-center justify-center">
                {currentTeam.illustration}
              </div>

              <h3 className={`text-xl sm:text-2xl font-black uppercase tracking-tight ${currentTeam.color} mt-1`}>
                {currentTeam.name}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Identitas tim Anda dirahasiakan akhir permainan. Menangkan suara sesuai dengan panji faksi Anda!
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Slot Kursi: #{privateState.slotNumber}</span>
              <span className="px-2 py-0.5 rounded-lg bg-black/60 text-slate-300 text-[11px] font-bold border border-slate-800 flex items-center gap-1">
                <span>Permanen</span>
                <Lock className="w-3 h-3 text-amber-400" />
              </span>
            </div>
          </div>

          {/* ================= CARD 2: SECRET ROLE CARD ================= */}
          <div className="rounded-2xl sm:rounded-3xl border-2 border-purple-500/80 bg-gradient-to-b from-[#211136] via-[#170c26] to-[#0e0717] shadow-[0_0_25px_rgba(168,85,247,0.25)] p-4 sm:p-5 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-purple-300 mb-1">
                <span>
                  ROLE #{roleInfo.number} • {roleInfo.badge}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-900/60 text-purple-200 border border-purple-500/50 text-[10px] font-extrabold">
                  Slot #{privateState.slotNumber}
                </span>
              </div>

              {/* Mystical Hands Swapping Artwork */}
              <div className="py-1 flex items-center justify-center">
                <RoleIllustration role={privateState.currentRole} className="w-full h-24 sm:h-28" />
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 leading-snug">
                {roleInfo.name}
              </h3>

              <p className="text-xs text-purple-200/90 leading-relaxed mt-1">
                Dapat ditukar oleh Role 1
              </p>

              {/* Role 2 Special Roll Badge if applicable */}
              {privateState.currentRole === 'ROLE_2_ROLLER' && (
                <div className="mt-2 p-1.5 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center gap-1.5 text-xs">
                  {privateState.role2CanVote === true ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300 font-bold">Hasil: BISA VOTE!</span>
                    </>
                  ) : privateState.role2CanVote === false ? (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="text-rose-300 font-bold">Hasil: TIDAK BISA VOTE</span>
                    </>
                  ) : (
                    <span className="text-purple-300">Menunggu undian hak suara...</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-2.5 border-t border-purple-900/50 flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span>Kemampuan Peran</span>
              <span className="text-[11px] text-purple-300 font-bold">Aktif Tiap Ronde</span>
            </div>
          </div>

          {/* ================= CARD 3: 3 KARTU MANDAT RONDE ================= */}
          <div className="rounded-2xl sm:rounded-3xl border-2 border-[#334155] bg-gradient-to-b from-[#111c2e] via-[#0c1421] to-[#070b13] shadow-[0_0_20px_rgba(51,65,85,0.3)] p-4 sm:p-5 flex flex-col justify-between transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                  <span>3 KARTU MANDAT RONDE</span>
                </span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400">
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Reset Tiap Ronde</span>
                </span>
              </div>

              {/* Fan of 3 Cards with Crests */}
              <div className="py-1 flex items-center justify-center">
                <VoteCardsFanIllustration cards={privateState.voteCards} className="w-full h-24 sm:h-28" />
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                Kartu Suara Mandat
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Diserahkan pada Fase Voting
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Total Suara:</span>
              <span className="text-sky-300 font-black">{privateState.voteCards?.length || 3} Kartu</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
          <p className="text-xs text-slate-400 italic">
            Informasi rahasia disembunyikan. Klik "Buka Rahasia" untuk melihat kembali identitas & kartu Anda.
          </p>
        </div>
      )}
    </div>
  );
};

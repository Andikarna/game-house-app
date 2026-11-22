'use client';

import React from 'react';
import {
  HiddenTeamMatchResult,
  HIDDEN_TEAM_ROLES_INFO,
  HiddenTeamFaction,
} from '@gamehouse/shared';
import { Trophy, RotateCcw, Home, Crown, CheckCircle2, Shield } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { useRouter } from 'next/navigation';

interface MatchResultScreenProps {
  matchResult: HiddenTeamMatchResult | null;
  isHost: boolean;
  onRematch: () => void;
}

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  matchResult,
  isHost,
  onRematch,
}) => {
  const router = useRouter();
  if (!matchResult) return null;

  const winner = matchResult.winner;
  const isDraw = winner === 'DRAW';

  const factions: HiddenTeamFaction[] = ['RED', 'BLUE', 'NEUTRAL'];
  const factionTheme: Record<
    HiddenTeamFaction,
    { name: string; text: string; bg: string; border: string; icon: string }
  > = {
    RED: {
      name: 'RED TEAM',
      text: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/50',
      icon: '⚔️',
    },
    BLUE: {
      name: 'BLUE TEAM',
      text: 'text-sky-400',
      bg: 'bg-sky-950/40',
      border: 'border-sky-500/50',
      icon: '🌊',
    },
    NEUTRAL: {
      name: 'NEUTRAL TEAM',
      text: 'text-amber-200',
      bg: 'bg-slate-800/60',
      border: 'border-slate-500/50',
      icon: '⚖️',
    },
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Victory Header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400/80 flex items-center justify-center text-4xl mx-auto mb-3 shadow-glow-orange animate-bounce">
          {isDraw ? '🤝' : '🏆'}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          {isDraw
            ? 'Pertandingan Berakhir SERI (DRAW)!'
            : `Faksi ${winner} Juara Pertandingan!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
          {isDraw
            ? 'Dua atau lebih tim memiliki total kemenangan ronde tertinggi yang sama tanpa pemenang tunggal.'
            : `Faksi ${winner} berhasil mengamankan kemenangan ronde terbanyak sepanjang ${matchResult.totalRounds} ronde dewan.`}
        </p>
      </div>

      {/* Standings Summary */}
      <div className="w-full grid grid-cols-3 gap-3 mb-6">
        {factions.map((f) => {
          const isWinner = winner === f;
          const wins = matchResult.finalRoundWins[f] || 0;
          const theme = factionTheme[f];

          return (
            <div
              key={f}
              className={`p-3.5 sm:p-4 rounded-2xl border text-center ${theme.bg} ${
                isWinner
                  ? 'border-amber-400 shadow-glow-orange ring-2 ring-amber-400 scale-[1.02]'
                  : theme.border
              }`}
            >
              <span className="text-2xl mb-1 block">{theme.icon}</span>
              <h4 className={`text-xs sm:text-sm font-black ${theme.text}`}>
                {theme.name}
              </h4>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {wins} <span className="text-xs text-slate-400 font-normal">Menang</span>
              </div>
              {isWinner && (
                <span className="text-[10px] font-black uppercase text-amber-300 block mt-1">
                  👑 Champion
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete Reveal: Player Identities & Final Roles */}
      <div className="w-full bg-[#181424] border border-slate-700/80 rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl">
        <h3 className="text-sm font-black uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-2">
          <span>🎭 Pengungkapan Identitas Lengkap Seluruh Pemain</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {matchResult.playerIdentities.map((p) => {
            const theme = factionTheme[p.team];
            const origRoleInfo = HIDDEN_TEAM_ROLES_INFO[p.originalRole];
            const finalRoleInfo = HIDDEN_TEAM_ROLES_INFO[p.finalRole];
            const wasSwapped = p.originalRole !== p.finalRole;

            return (
              <div
                key={p.playerId}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-[10px] font-black text-slate-300 flex items-center justify-center">
                      #{p.slotNumber}
                    </span>
                    <h4 className="text-sm font-black text-white">
                      {p.nickname}
                    </h4>
                  </div>

                  {/* Team badge */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        p.team === 'RED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : p.team === 'BLUE'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                          : 'bg-slate-700 text-amber-200 border-slate-500'
                      }`}
                    >
                      {theme.icon} {theme.name}
                    </span>
                  </div>

                  {/* Roles: Initial and Final */}
                  <div className="mt-2 text-[11px] text-slate-300 space-y-0.5">
                    <div>
                      <span className="text-slate-500">Role Awal:</span>{' '}
                      <span className="font-bold">{origRoleInfo?.name}</span>
                    </div>
                    {wasSwapped && (
                      <div className="text-amber-400">
                        <span className="text-slate-500">Role Akhir (Swap):</span>{' '}
                        <span className="font-bold">{finalRoleInfo?.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        {isHost && (
          <Button
            variant="orange"
            size="lg"
            glow
            onClick={onRematch}
            className="w-full sm:w-auto font-black px-8 py-3 text-sm"
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Mulai Ulang (Rematch)
          </Button>
        )}

        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push('/')}
          className="w-full sm:w-auto font-bold px-6 py-3 text-sm"
          icon={<Home className="w-4 h-4" />}
        >
          Kembali ke GameHouse
        </Button>
      </div>
    </div>
  );
};

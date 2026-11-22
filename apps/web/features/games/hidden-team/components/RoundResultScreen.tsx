'use client';

import React from 'react';
import {
  HiddenTeamPublicGameState,
  HiddenTeamRoundResult,
  HiddenTeamFaction,
} from '@gamehouse/shared';
import { Trophy, Clock, Flame, Shield, Award, AlertCircle } from 'lucide-react';

interface RoundResultScreenProps {
  state: HiddenTeamPublicGameState;
  roundResult: HiddenTeamRoundResult | null;
}

export const RoundResultScreen: React.FC<RoundResultScreenProps> = ({
  state,
  roundResult,
}) => {
  if (!roundResult) return null;

  const card = roundResult.activeMainCard;
  const winner = roundResult.winningTeam;
  const isTie = roundResult.isTieOrNoWin;

  const factions: HiddenTeamFaction[] = ['RED', 'BLUE', 'NEUTRAL'];
  const factionTheme: Record<
    HiddenTeamFaction,
    { name: string; text: string; bg: string; border: string; icon: string }
  > = {
    RED: {
      name: 'Faksi RED',
      text: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/40',
      icon: '⚔️',
    },
    BLUE: {
      name: 'Faksi BLUE',
      text: 'text-sky-400',
      bg: 'bg-sky-950/40',
      border: 'border-sky-500/40',
      icon: '🌊',
    },
    NEUTRAL: {
      name: 'Faksi NEUTRAL',
      text: 'text-amber-200',
      bg: 'bg-slate-800/50',
      border: 'border-slate-500/40',
      icon: '⚖️',
    },
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-3 sm:p-6 max-w-4xl mx-auto w-full">
      {/* Top Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
          <Award className="w-3.5 h-3.5 text-amber-400" /> Hasil Akhir Ronde #{roundResult.roundNumber}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {winner
            ? `Panji ${winner} Merebut Kemenangan Ronde!`
            : 'Tidak Ada Pemenang Pada Ronde Ini'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-1 leading-relaxed">
          {roundResult.reason}
        </p>

        {/* Phase Timer */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-amber-400 text-xs font-black mt-2.5">
          <Clock className="w-3.5 h-3.5" /> Ronde berikutnya dalam {state.phaseTimer}s
        </div>
      </div>

      {/* Main Card Revealed Flag Card */}
      <div className="w-full bg-[#181528] border border-amber-500/50 rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{card.illustration || '📜'}</span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Panji Target Terungkap
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {card.title}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-xs sm:text-sm font-black uppercase px-3 py-1 rounded-xl border shadow-lg ${
                card.teamFlag === 'RED'
                  ? 'bg-rose-500/30 text-rose-300 border-rose-500 shadow-rose-500/20'
                  : card.teamFlag === 'BLUE'
                  ? 'bg-sky-500/30 text-sky-300 border-sky-500 shadow-sky-500/20'
                  : 'bg-slate-700 text-amber-200 border-slate-400'
              }`}
            >
              Panji Terpilih: {card.teamFlag}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 italic mt-2">
          "{card.scenario}"
        </p>
      </div>

      {/* Vote Calculation Table */}
      <div className="w-full bg-surface-elevated/70 border border-slate-700 rounded-2xl p-4 sm:p-5 mb-5 shadow-xl">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
          <span>🗳️ Rincian Perhitungan Kotak Suara</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {factions.map((f) => {
            const theme = factionTheme[f];
            const orig = roundResult.originalVotes[f] || 0;
            const bonus = roundResult.bonusVotes[f] || 0;
            const disc = roundResult.discardedVotes[f] || 0;
            const finalVal = roundResult.finalVotes[f] || 0;
            const isMatchTarget = card.teamFlag === f;
            const isRoundWinner = winner === f;

            return (
              <div
                key={f}
                className={`p-3.5 rounded-xl border ${theme.bg} ${
                  isRoundWinner
                    ? 'border-amber-400 shadow-glow-orange ring-1 ring-amber-400'
                    : theme.border
                } flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">{theme.icon}</span>
                    <div className="flex items-center gap-1">
                      {isMatchTarget && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/40 text-amber-300">
                          Target
                        </span>
                      )}
                      {isRoundWinner && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                          Menang +1
                        </span>
                      )}
                    </div>
                  </div>

                  <h5 className={`text-sm font-black ${theme.text}`}>
                    {theme.name}
                  </h5>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Suara Awal:</span>
                      <span className="font-bold">{orig}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bonus Role 3:</span>
                      <span className="font-bold text-emerald-400">+{bonus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Discard Role 4:</span>
                      <span className="font-bold text-rose-400">-{disc}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">Total Valid:</span>
                  <span className={`text-base font-black ${theme.text}`}>
                    {finalVal} Suara
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Standings Ticker */}
      <div className="w-full bg-[#13111E] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Akumulasi Kemenangan Ronde (Round Wins)
          </span>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm font-black text-rose-400">
              🔴 RED: {roundResult.roundWinsSoFar.RED}
            </span>
            <span className="text-sm font-black text-sky-400">
              🔵 BLUE: {roundResult.roundWinsSoFar.BLUE}
            </span>
            <span className="text-sm font-black text-amber-200">
              ⚖️ NEUTRAL: {roundResult.roundWinsSoFar.NEUTRAL}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 italic">
          Identitas tim pemain tetap dirahasiakan hingga akhir match.
        </div>
      </div>
    </div>
  );
};

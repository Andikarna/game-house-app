'use client';

import React, { useEffect, useState } from 'react';
import { UnoLeaderboardEntry } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Trophy, Flame, X, Database, RefreshCw } from 'lucide-react';

interface UnoLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnoLeaderboardModal: React.FC<UnoLeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UnoLeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/uno/leaderboard', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setSchemaReady(Boolean(data.schemaReady));
        setLeaderboard(data.leaderboard || []);
        setRecentMatches(data.recentMatches || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-surface border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">
                Leaderboard UNO Global
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                Tersinkron ke Supabase Postgres
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-surface-elevated border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-surface-elevated border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!schemaReady ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-left text-xs text-amber-200 space-y-2">
            <div className="font-black text-sm">Supabase Schema Belum Dijalankan</div>
            <p className="text-slate-300 leading-relaxed">
              Supabase Realtime tetap aktif dengan latensi rendah! Untuk mengaktifkan penyimpanan permanen leaderboard & riwayat pertandingan, jalankan file <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">supabase/uno_schema.sql</code> di Supabase SQL Editor Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1">
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada catatan pertandingan UNO. Selesaikan 1 ronde untuk masuk peringkat Supabase!
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-surface-elevated/60 divide-y divide-slate-800/70">
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.nickname}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center font-black text-amber-300">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <ClimberAvatarIcon avatar={entry.avatar} size={30} shape="circle" />
                      <div className="min-w-0">
                        <div className="font-extrabold text-white truncate">{entry.nickname}</div>
                        <div className="text-[10px] text-slate-400">
                          {entry.matches_played} Main • 🔥 {entry.uno_shouts}x UNO
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-emerald-400">{entry.wins} Menang</div>
                      <div className="text-[10px] font-bold text-amber-300 flex items-center justify-end gap-0.5">
                        <Flame className="w-3 h-3" /> {entry.total_score} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentMatches.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                  Pertandingan Terbaru
                </h4>
                <div className="space-y-1.5">
                  {recentMatches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-elevated/40 border border-slate-800 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-400 font-bold">#{m.room_code}</span>
                        <span className="text-white font-bold">🏆 {m.winner_nickname}</span>
                      </div>
                      <span className="text-slate-400">
                        {m.player_count} Pemain • {m.total_turns} Giliran
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

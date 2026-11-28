'use client';

import React, { useEffect, useState } from 'react';
import { UnoLeaderboardEntry } from '@gamehouse/shared';
import { ClimberAvatarIcon } from '../../../components/ui/AvatarSelector';
import { Trophy, Flame, X, Database, RefreshCw, Medal, Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnoLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnoLeaderboardModal: React.FC<UnoLeaderboardModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UnoLeaderboardEntry[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'recent'>('leaderboard');

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
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const rankMedal = (idx: number) =>
    idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="w-full max-w-lg bg-[#111827] border border-amber-500/30 rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Ambient top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 bg-amber-500/15 blur-3xl rounded-full pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-400/40 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">Leaderboard UNO</h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Database className="w-3 h-3 text-emerald-400" />
                  Tersinkron ke MySQL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={loadData}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 px-5 pb-3 relative z-10">
            {(['leaderboard', 'recent'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-amber-500/25 border border-amber-400/60 text-amber-200'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'leaderboard' ? '🏆 Peringkat' : '🎮 Riwayat'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 pb-5 relative z-10 space-y-2.5">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Memuat data...
              </div>
            )}

            {!loading && activeTab === 'leaderboard' && (
              <>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Belum ada data. Selesaikan 1 ronde UNO untuk masuk peringkat!
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {leaderboard.map((entry, idx) => {
                      const medal = rankMedal(idx);
                      return (
                        <motion.div
                          key={entry.nickname}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors ${
                            idx === 0
                              ? 'bg-amber-500/15 border-amber-400/40'
                              : idx === 1
                              ? 'bg-slate-400/10 border-slate-500/30'
                              : idx === 2
                              ? 'bg-orange-500/10 border-orange-600/30'
                              : 'bg-white/5 border-white/8'
                          }`}
                        >
                          <span className="w-7 text-center text-base shrink-0">
                            {medal || (
                              <span className="text-[11px] font-black text-slate-400">#{idx + 1}</span>
                            )}
                          </span>
                          <ClimberAvatarIcon avatar={entry.avatar} size={34} shape="circle" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-extrabold text-white truncate">
                              {entry.nickname}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{entry.matches_played} Main</span>
                              <span>•</span>
                              <Flame className="w-2.5 h-2.5 text-orange-400" />
                              <span>{entry.uno_shouts}x UNO</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-emerald-400">{entry.wins} Menang</div>
                            <div className="text-[10px] font-bold text-amber-300 flex items-center justify-end gap-0.5">
                              <Zap className="w-2.5 h-2.5" />
                              {entry.total_score.toLocaleString()} pts
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!loading && activeTab === 'recent' && (
              <>
                {recentMatches.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Belum ada riwayat pertandingan.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {recentMatches.map((m, idx) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 border border-white/8"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-amber-400 font-black text-xs shrink-0">#{m.room_code}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">🏆 {m.winner_nickname}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {m.game_mode} • {m.player_count} Pemain
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 shrink-0 text-right">
                          {m.total_turns} Giliran
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

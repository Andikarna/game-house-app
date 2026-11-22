'use client';

import React, { useState } from 'react';
import { Modal } from '../../../../components/ui/Modal';
import { HIDDEN_TEAM_ROLES_INFO, HiddenTeamRole } from '@gamehouse/shared';
import {
  Shield,
  Sparkles,
  Layers,
  Trophy,
  CheckCircle2,
  BookOpen,
  Crown,
  Eye,
  Repeat,
  Shuffle,
  Dice5,
  Lock,
  Swords,
  Clock,
  ArrowRight,
  Info,
} from 'lucide-react';

export type HiddenTeamRulesTab = 'flow' | 'roles' | 'scoring';

interface HiddenTeamRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HiddenTeamRulesTab;
}

export const HiddenTeamRulesModal: React.FC<HiddenTeamRulesModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'flow',
}) => {
  const [activeTab, setActiveTab] = useState<HiddenTeamRulesTab>(initialTab);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const roles: HiddenTeamRole[] = [
    'ROLE_1_SWAPPER',
    'ROLE_2_ROLLER',
    'ROLE_3_MULTIPLIER',
    'ROLE_4_INSPECTOR',
    'ROLE_5_SELECTOR',
    'ROLE_6_CARD_SWAPPER',
  ];

  const roleMeta: Record<
    HiddenTeamRole,
    {
      icon: React.ReactNode;
      color: string;
      timing: string;
      target: string;
      strategy: string;
    }
  > = {
    ROLE_1_SWAPPER: {
      icon: <Shuffle className="w-4 h-4 text-purple-400" />,
      color: 'border-purple-500/50 bg-purple-950/20 text-purple-300',
      timing: 'Fase 4 (Giliran Aksi Slot)',
      target: '2 Pemain Mana Pun',
      strategy:
        'Tukar ability rekan Anda untuk menyelamatkannya dari role berisiko, atau kacaukan rencana pemain musuh. Slot kursi (1-6) tidak pernah berubah!',
    },
    ROLE_2_ROLLER: {
      icon: <Dice5 className="w-4 h-4 text-emerald-400" />,
      color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
      timing: 'Awal Tiap Ronde (Reset otomatis)',
      target: 'Diri Sendiri (Undian Server 50:50)',
      strategy:
        'Hasil undian bersifat rahasia. Jika Anda tidak bisa vote, 3 kartu mandat Anda tidak masuk kotak suara—atur gertakan agar tim lain tidak menyadarinya!',
    },
    ROLE_3_MULTIPLIER: {
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      color: 'border-amber-500/50 bg-amber-950/20 text-amber-300',
      timing: 'Fase 4 (Giliran Aksi Slot)',
      target: '1 Pemain Target',
      strategy:
        'Target mendapat +1 bobot suara untuk SETIAP kartu mandat yang diserahkannya. Berikan ke pemain yang Anda duga sekutu satu faksi!',
    },
    ROLE_4_INSPECTOR: {
      icon: <Eye className="w-4 h-4 text-pink-400" />,
      color: 'border-pink-500/50 bg-pink-950/20 text-pink-300',
      timing: 'Fase 6 (Setelah Pemungutan Suara)',
      target: '1 Kartu Acak dari Kotak Suara',
      strategy:
        'Server mengambil 1 kartu acak tanpa mengungkap pemiliknya. Pilih KEEP jika kartu tersebut faksi Anda, atau DISCARD jika merugikan sasaran panji!',
    },
    ROLE_5_SELECTOR: {
      icon: <Crown className="w-4 h-4 text-yellow-400" />,
      color: 'border-yellow-500/50 bg-yellow-950/20 text-yellow-300',
      timing: 'Fase 3 (Sebelum Aksi Dimulai)',
      target: 'Pilih 1 dari 2 Kartu Takdir Dewan',
      strategy:
        'Kunci Kartu Takdir yang panjinya sama dengan faksi rahasia Anda. Panji target akan dirahasiakan dari semua pemain lain hingga ronde berakhir!',
    },
    ROLE_6_CARD_SWAPPER: {
      icon: <Repeat className="w-4 h-4 text-rose-400" />,
      color: 'border-rose-500/50 bg-rose-950/20 text-rose-300',
      timing: 'Fase 4 (Giliran Aksi Slot)',
      target: '2 Pemain Mana Pun',
      strategy:
        'Tukar SELURUH 3 kartu mandat antara dua pemain sekaligus sebelum voting dikunci. Manuver terbaik untuk mengamankan kartu kemenangan faksi Anda!',
    },
  };

  const phases = [
    {
      num: 1,
      title: 'Inisialisasi Ronde & Pembagian Kartu',
      desc: 'Setiap pemain menerima 3 Kartu Mandat baru secara acak (RED, BLUE, atau NEUTRAL). Kartu ronde sebelumnya di-reset total.',
      tag: 'Otomatis',
      color: 'bg-slate-800 text-slate-300 border-slate-700',
    },
    {
      num: 2,
      title: 'Pemilihan Kartu Takdir (Role 5)',
      desc: 'Pemilik Role 5 memilih 1 dari 2 Kartu Takdir Dewan. Panji sasaran (RED / BLUE / NEUTRAL) dirahasiakan dari pemain lain.',
      tag: 'Role 5 Saja',
      color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    },
    {
      num: 3,
      title: 'Giliran Aksi Slot 1 s/d 6 (Tetap)',
      desc: 'Giliran berjalan berurutan dari Slot 1 sampai 6. Setiap pemain mengeksekusi ability yang mereka miliki pada slot tersebut. Slot tidak pernah berubah!',
      tag: 'Slot 1-6',
      color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    },
    {
      num: 4,
      title: 'Penyerahan Kartu Mandat ke Kotak Suara',
      desc: 'Pemain yang memiliki hak suara (Role 2 lolos undian) menyerahkan kartu mandatnya secara rahasia ke kotak suara dewan.',
      tag: 'Voting Tertutup',
      color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    },
    {
      num: 5,
      title: 'Manipulasi Suara & Inspeksi (Role 4)',
      desc: 'Server mengaplikasikan pertukaran kartu (Role 6), bonus pengganda (Role 3), lalu Role 4 memilih KEEP / DISCARD pada 1 kartu acak.',
      tag: 'Server Lock',
      color: 'bg-pink-500/15 text-pink-300 border-pink-500/40',
    },
    {
      num: 6,
      title: 'Perhitungan Suara Valid Mutlak',
      desc: 'Server menghitung suara valid yang selamat dari diskard untuk masing-masing faksi (RED, BLUE, NEUTRAL) beserta bobot bonusnya.',
      tag: 'Authoritative',
      color: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    },
    {
      num: 7,
      title: 'Pengungkapan Panji & Pemenang Ronde',
      desc: 'Panji Kartu Takdir diungkap ke publik! Faksi menang jika panjinya COCOK dengan kartu DAN suaranya tertinggi mutlak dari faksi lain.',
      tag: 'Resolusi Ronde',
      color: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    },
    {
      num: 8,
      title: 'Penentuan Juara Akhir Match',
      desc: 'Setelah 4, 5, atau 6 ronde selesai, faksi dengan jumlah ronde terbanyak dinobatkan sebagai Juara Dewan Rahasia!',
      tag: 'Match Win',
      color: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🕵️ Panduan Lengkap Hidden Team: Secret Role"
    >
      <div className="p-4 sm:p-6 space-y-5 text-slate-200 text-xs sm:text-sm max-h-[78vh] overflow-y-auto pr-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-elevated/90 border border-slate-700/80 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'flow'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Alur Main & 8 Fase</span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-gradient-to-r from-rose-600 to-purple-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>6 Role & Kemampuan</span>
          </button>

          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'scoring'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Aturan Skor & Menang</span>
          </button>
        </div>

        {/* TAB 1: ALUR PERMAINAN & 8 FASE */}
        {activeTab === 'flow' && (
          <div className="space-y-4 animate-fade-in">
            {/* Core Premise */}
            <div className="bg-[#1C172B] p-4 sm:p-5 rounded-2xl border border-purple-500/40 text-white shadow-xl">
              <h3 className="font-black text-amber-300 text-sm mb-2 uppercase tracking-wider flex items-center gap-2">
                <span>🎯 Premis & Konsep Utama</span>
              </h3>
              <p className="leading-relaxed text-xs text-slate-300 mb-3">
                Hidden Team dirancang khusus untuk <span className="text-white font-black">tepat 6 pemain</span>. 
                Pemain terbagi ke dalam 3 Faksi Tersembunyi yang saling bersaing di meja dewan rahasia:
              </p>

              {/* 3 Factions Showcase */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50">
                  <div className="font-black text-red-400 flex items-center gap-1.5 mb-1">
                    <Swords className="w-3.5 h-3.5" /> Faksi RED (2 Pemain)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Faksi merah berjuang meloloskan mandat merah saat Panji Kartu Takdir bernilai RED.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/50">
                  <div className="font-black text-sky-400 flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5" /> Faksi BLUE (2 Pemain)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Faksi biru mempertahankan stabilitas dewan saat Panji Kartu Takdir bernilai BLUE.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50">
                  <div className="font-black text-amber-300 flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5" /> Faksi NEUTRAL (2 Pemain)
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Faksi mandiri independen yang mengejar kemenangan mutlak saat panji bernilai NEUTRAL.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-purple-900/60 flex items-center gap-2 text-[11px] text-purple-200">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Identitas tim Anda <strong className="text-white">tetap rahasia</strong> sampai akhir seluruh match!</span>
              </div>
            </div>

            {/* Turn Slot Invariant */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Aturan Tetap: Slot Giliran 1 s/d 6
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Setiap pemain menempati <strong>Slot Giliran Kursi 1 sampai 6</strong>. Slot ini bersifat tetap dan <strong>TIDAK PERNAH BERUBAH</strong>. 
                Jika Role 1 menukar kemampuan peran antar pemain di tengah fase aksi, urutan giliran tetap berjalan berurutan dari Slot 1 ke 6 menggunakan kemampuan baru yang telah berpindah tangan.
              </p>
            </div>

            {/* 8-Phase Step Flow */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                <span>🔄 8 Tahapan Alur Tiap Ronde:</span>
              </h4>

              <div className="space-y-2">
                {phases.map((p) => (
                  <div
                    key={p.num}
                    className="p-3 rounded-xl bg-surface-elevated/70 border border-slate-800 flex items-start gap-3 hover:border-slate-600 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-xs font-black text-indigo-300 shrink-0 mt-0.5">
                      {p.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h5 className="text-xs font-black text-white">{p.title}</h5>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${p.color}`}>
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {p.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 6 ROLE UNIK & KEMAMPUAN */}
        {activeTab === 'roles' && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Di awal permainan, ke-6 role dibagikan secara acak (1 role untuk tiap pemain). Peran dapat berpindah tangan jika ditukar oleh <strong>Role 1</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((rId) => {
                const r = HIDDEN_TEAM_ROLES_INFO[rId];
                const meta = roleMeta[rId];

                return (
                  <div
                    key={rId}
                    className="p-4 rounded-2xl bg-gradient-to-b from-[#181d29] to-[#0f1420] border-2 border-slate-700/80 shadow-lg flex flex-col justify-between hover:border-amber-500/60 transition-all"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-xl bg-slate-800 border border-slate-700">
                            {meta.icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                              ROLE #{r.number}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                              {r.name}
                            </h4>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${meta.color}`}>
                          {r.badge}
                        </span>
                      </div>

                      {/* Ability Description */}
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">
                        {r.description}
                      </p>

                      {/* Key details */}
                      <div className="space-y-1 py-2 border-y border-slate-800 text-[11px]">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Waktu Aktif:</span>
                          <span className="text-slate-200 font-bold">{meta.timing}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Sasaran Aksi:</span>
                          <span className="text-slate-200 font-bold">{meta.target}</span>
                        </div>
                      </div>
                    </div>

                    {/* Strategy Advice */}
                    <div className="mt-3 pt-2 text-[11px] text-amber-300/90 leading-snug bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                      💡 <strong>Tips Taktik:</strong> {meta.strategy}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ATURAN SKOR & KEMENANGAN */}
        {activeTab === 'scoring' && (
          <div className="space-y-4 animate-fade-in">
            {/* Round Win Rules */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1a1429] border border-amber-500/40 shadow-xl space-y-3">
              <h3 className="font-black text-amber-400 text-sm uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Aturan Mutlak Kemenangan Ronde</span>
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Sebuah faksi (RED, BLUE, atau NEUTRAL) dinobatkan sebagai pemenang ronde dan mendapatkan <strong>+1 Kemenangan Ronde</strong> HANYA JIKA memenuhi <strong className="text-white">DUA SYARAT MUTLAK</strong> berikut:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                  <div className="font-black text-emerald-300 text-xs flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Syarat 1: Panji Cocok
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Faksi Anda harus <strong className="text-white">sama persis</strong> dengan Panji Kartu Takdir Utama yang dipilih oleh Role 5 di awal ronde.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                  <div className="font-black text-emerald-300 text-xs flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Syarat 2: Suara Terbanyak Mutlak
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Total suara valid faksi Anda di kotak suara harus <strong className="text-white">strictly higher</strong> (lebih tinggi murni) dari 2 tim lainnya.
                  </p>
                </div>
              </div>

              {/* No Win Conditions */}
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs space-y-1 mt-2">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️ Kapan Ronde Berakhir Tanpa Pemenang (0 Poin)?</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                  <li>Jika faksi yang cocok dengan panji TIDAK memiliki suara terbanyak.</li>
                  <li>Jika terjadi hasil suara IMBANG (Tie) antara faksi panji dengan tim lain.</li>
                  <li>Faksi Neutral diperlakukan independen dengan aturan persis sama seperti Red dan Blue.</li>
                </ul>
              </div>
            </div>

            {/* Match Win Condition */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated border border-slate-700/80 space-y-2.5">
              <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-yellow-400" /> Penentuan Juara Match (4, 5, atau 6 Ronde)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Match berlangsung dalam 4, 5, atau 6 ronde (dapat diatur host saat lobby). 
                Faksi yang mengumpulkan <strong>total kemenangan ronde terbanyak</strong> keluar sebagai pemenang match.
                Jika dua tim memiliki jumlah kemenangan yang sama, hasil match resmi dinyatakan sebagai <strong className="text-amber-400">DRAW</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>🛡️ Siap bertarung dalam dewan rahasia!</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
          >
            Mengerti, Siap Main!
          </button>
        </div>
      </div>
    </Modal>
  );
};

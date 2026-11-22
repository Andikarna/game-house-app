'use client';

import React, { useState } from 'react';
import { KeyRound, Users, Dices, Trophy, Zap, Shield, HelpCircle } from 'lucide-react';

export const HowToPlay: React.FC = () => {
  const [guideTab, setGuideTab] = useState<'general' | 'panjat-pinang' | 'ludo' | 'impostor-desa' | 'hidden-team'>('general');

  const generalSteps = [
    {
      step: '01',
      title: 'Buat atau Masuk Room',
      description: 'Host menekan tombol "Buat Party Room" lalu membagikan kode 5 huruf unik (contoh: GH-78921) atau menyalin link undangan langsung ke WhatsApp / Discord.',
      icon: <KeyRound className="w-5 h-5 text-indigo-400" />,
    },
    {
      step: '02',
      title: 'Pilih Game & Atur Mode',
      description: 'Pilih antara Panjat Pinang Battle (2-8 pemain) atau Ludo Party (2-4 pemain). Tentukan mode lomba yang disukai oleh tongkronganmu.',
      icon: <Dices className="w-5 h-5 text-orange-400" />,
    },
    {
      step: '03',
      title: 'Pilih Avatar & Emote',
      description: 'Gunakan karakter favoritmu (Budi, Ujang, Rara, dll) dan siapkan 24 emote animasi seru untuk saling ejek atau menyemangati lawan di arena.',
      icon: <Users className="w-5 h-5 text-cyan-400" />,
    },
    {
      step: '04',
      title: 'Tanding & Raih Kemenangan!',
      description: 'Bermain real-time bersama teman di browser. Pemenang akan dinobatkan di podium juara lengkap dengan animasi selebrasi!',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
    },
  ];

  const panjatTips = [
    {
      key: 'W / Panah Atas',
      action: 'Memanjat Tiang',
      tip: 'Tekan berulang untuk naik. Perhatikan stamina bar agar tidak kehabisan napas!',
    },
    {
      key: 'A & D / Panah Kiri-Kanan',
      action: 'Jaga Keseimbangan',
      tip: 'Oli tiang membuat badanmu condong ke samping. Segera tekan arah sebaliknya agar tidak terpeleset!',
    },
    {
      key: 'Q & E & R',
      action: 'Aktifkan Skill & Jebakan',
      tip: 'Gunakan Iron Grip untuk kebal slip, lempar Pisang ke jalur lawan, atau Wind Boost untuk melesat naik!',
    },
  ];

  const ludoTips = [
    {
      key: 'Dadu Angka 6',
      action: 'Keluar Markas',
      tip: 'Bidak hanya bisa keluar ke jalur jika kamu mendapatkan angka 6. Angka 6 juga memberikan lemparan ekstra!',
    },
    {
      key: 'Makan Bidak',
      action: 'Serang Musuh',
      tip: 'Mendarat di petak yang ditempati bidak lawan akan menendang bidak mereka kembali ke markas awal!',
    },
    {
      key: 'Petak Bintang',
      action: 'Zona Aman',
      tip: 'Petak berbintang adalah zona netral aman. Bidakmu tidak dapat dimakan oleh lawan saat berada di sini.',
    },
  ];

  const impostorTips = [
    {
      key: '1. Pembagian Peran',
      action: 'Lihat Role Rahasia',
      tip: 'Warga menerima kata rahasia yang sama (contoh: "Sawah"). 1 Impostor yang terpilih acak tidak tahu kata tersebut!',
    },
    {
      key: '2. Giliran Petunjuk',
      action: 'Kirim 1 Petunjuk Singkat',
      tip: 'Pemain bergiliran mengirim 1 petunjuk (maks 40 huruf). Jangan sebut kata rahasia langsung agar tidak disontek Impostor!',
    },
    {
      key: '3. Diskusi & Voting',
      action: 'Tuduh Siapa Impostor',
      tip: 'Bahas petunjuk mencurigakan dan lakukan voting rahasia. Jika seri, kandidat tertinggi masuk fase revote!',
    },
    {
      key: '4. Kesempatan Impostor',
      action: 'Tebak Kata Rahasia',
      tip: 'Jika Impostor tertangkap, ia diberi 1 kesempatan menebak kata rahasia desa. Jika benar, Impostor Menang!',
    },
  ];

  const hiddenTeamTips = [
    {
      key: '1. Tiga Faksi Rahasia',
      action: 'Ketahui Tujuan Tim',
      tip: 'RED ingin memenangkan kubu Merah, BLUE ingin kubu Biru menang, dan NEUTRAL memiliki misi rahasia independen!',
    },
    {
      key: '2. Enam Role Spesial',
      action: 'Gunakan Skill Role',
      tip: 'Setiap peran (Agent, Assassin, Oracle, dll) memiliki kekuatan taktis untuk melihat atau menukar informasi dewan.',
    },
    {
      key: '3. Tukar Peran & Kartu',
      action: 'Manipulasi Dewan',
      tip: 'Aksi giliran memungkinkan pertukaran kartu peran dan kartu meja. Curigai siapapun yang mengubah susunan kartu!',
    },
    {
      key: '4. Voting Kotak Suara',
      action: 'Tentukan Pemenang',
      tip: 'Di fase akhir, satukan suara untuk menentukan kartu utama yang lolos dan menangkan faksi rahasiamu!',
    },
  ];

  return (
    <section className="w-full py-12 sm:py-20 px-3 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-black uppercase tracking-wider mb-2">
          <HelpCircle className="w-3.5 h-3.5 text-orange-400" />
          Panduan Bermain
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Cara Bermain di GameHouse
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-2">
          Mudah dipahami, ramah pemula, dan seru dimainkan bersama kawan-kawan.
        </p>

        {/* Guide Switcher Tabs */}
        <div className="inline-flex p-1 bg-surface-elevated/80 border border-slate-700/80 rounded-2xl backdrop-blur-md mt-6 flex-wrap">
          <button
            onClick={() => setGuideTab('general')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              guideTab === 'general'
                ? 'bg-orange-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Alur Party Room
          </button>
          <button
            onClick={() => setGuideTab('panjat-pinang')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              guideTab === 'panjat-pinang'
                ? 'bg-orange-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tips Panjat Pinang
          </button>
          <button
            onClick={() => setGuideTab('ludo')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              guideTab === 'ludo'
                ? 'bg-indigo-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tips Ludo Party
          </button>
          <button
            onClick={() => setGuideTab('impostor-desa')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              guideTab === 'impostor-desa'
                ? 'bg-emerald-600 text-white shadow-glow-primary'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tips I'amPostor
          </button>
          <button
            onClick={() => setGuideTab('hidden-team')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              guideTab === 'hidden-team'
                ? 'bg-rose-600 text-white shadow-glow-orange'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tips Hidden Team
          </button>
        </div>
      </div>

      {/* Tab: General Guide */}
      {guideTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {generalSteps.map((item) => (
            <div
              key={item.step}
              className="p-6 rounded-3xl bg-surface border border-slate-700/70 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-600 transition-colors"
            >
              <span className="text-6xl font-black text-slate-800/60 absolute top-3 right-4 select-none pointer-events-none group-hover:text-slate-800 transition-colors">
                {item.step}
              </span>

              <div className="w-11 h-11 rounded-2xl bg-surface-elevated border border-slate-700 flex items-center justify-center mb-5 z-10 shadow-md">
                {item.icon}
              </div>

              <div className="z-10">
                <h4 className="text-base sm:text-lg font-black text-white mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Panjat Pinang Tips */}
      {guideTab === 'panjat-pinang' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {panjatTips.map((tip, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-orange-500/30 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/40 text-xs font-black mb-3">
                  {tip.key}
                </div>
                <h4 className="text-lg font-black text-white mb-2">{tip.action}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Ludo Party Tips */}
      {guideTab === 'ludo' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {ludoTips.map((tip, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-indigo-500/30 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 text-xs font-black mb-3">
                  {tip.key}
                </div>
                <h4 className="text-lg font-black text-white mb-2">{tip.action}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Impostor Desa Tips */}
      {guideTab === 'impostor-desa' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {impostorTips.map((tip, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-emerald-500/30 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-black mb-3 shadow-sm">
                  {tip.key}
                </div>
                <h4 className="text-base sm:text-lg font-black text-white mb-2">{tip.action}</h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Hidden Team Tips */}
      {guideTab === 'hidden-team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {hiddenTeamTips.map((tip, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-surface border border-rose-500/30 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="inline-block px-3 py-1 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/40 text-xs font-black mb-3 shadow-sm">
                  {tip.key}
                </div>
                <h4 className="text-base sm:text-lg font-black text-white mb-2">{tip.action}</h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

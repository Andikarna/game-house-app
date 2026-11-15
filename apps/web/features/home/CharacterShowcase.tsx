'use client';

import React, { useState } from 'react';
import { AVATAR_OPTIONS, EMOTE_LIST, AvatarOption } from '@gamehouse/shared';
import { Sparkles, Smile, Shield, Trophy } from 'lucide-react';

export const CharacterShowcase: React.FC = () => {
  // Use the 8 primary characters (exclude old climber- aliases)
  const characters: AvatarOption[] = AVATAR_OPTIONS.filter(
    (a) => !a.id.startsWith('climber-')
  );

  const [selectedChar, setSelectedChar] = useState<AvatarOption>(characters[0]);

  // Highlight top 8 popular emotes
  const sampleEmotes = EMOTE_LIST.slice(0, 8);

  return (
    <section className="w-full py-12 sm:py-16 px-3 sm:px-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Karakter & Emote Interaktif
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Pilih Jagoanmu & Ekspresikan Gayamu!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-2">
          Setiap pemain dapat memilih dari 8 karakter khas Indonesia dan mengirimkan 24 emote reaksi animasi seru saat bertanding.
        </p>
      </div>

      {/* Character Grid + Spotlight Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: 8 Character Select Grid (8 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {characters.map((char) => {
            const isSelected = selectedChar.id === char.id;
            return (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char)}
                className={`p-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center group relative overflow-hidden ${
                  isSelected
                    ? 'bg-surface-elevated border-indigo-400 shadow-glow-primary scale-102 ring-2 ring-indigo-500/50'
                    : 'bg-surface/80 border-slate-800 hover:border-slate-700 hover:bg-surface-elevated/60'
                }`}
              >
                {/* Character Avatar Circle */}
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-2 flex items-center justify-center p-1 relative border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${char.color}20`,
                    borderColor: `${char.color}60`,
                  }}
                >
                  <img
                    src={`${char.spriteBase}/avatar.png`}
                    alt={char.name}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute -top-1 -right-1 text-sm drop-shadow">
                    {char.badge}
                  </span>
                </div>

                <div className="w-full">
                  <div className="text-xs sm:text-sm font-black text-white truncate">
                    {char.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {char.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Selected Character Spotlight Preview (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-surface-elevated to-surface border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: selectedChar.color }}
          />

          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-20 h-20 rounded-2xl p-2 border-2 flex items-center justify-center shadow-xl relative"
              style={{
                backgroundColor: `${selectedChar.color}25`,
                borderColor: selectedChar.color,
              }}
            >
              <img
                src={`${selectedChar.spriteBase}/avatar.png`}
                alt={selectedChar.name}
                className="w-full h-full object-contain animate-bounce-subtle"
              />
              <span className="absolute -top-1.5 -right-1.5 text-lg">
                {selectedChar.badge}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Profil Karakter
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: selectedChar.color }}
                />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {selectedChar.name}
              </h3>
              <p
                className="text-xs font-bold"
                style={{ color: selectedChar.color }}
              >
                {selectedChar.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mb-5">
            "{selectedChar.tagline}"
          </p>

          {/* Emote Preview Strip */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Smile className="w-3.5 h-3.5 text-amber-400" /> Emote & Taunt Interaktif
              </span>
              <span className="text-[11px] text-indigo-400 font-semibold">24 Pilihan</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {sampleEmotes.map((emote) => (
                <div
                  key={emote.id}
                  className="flex-shrink-0 w-11 h-11 rounded-xl bg-slate-900/90 border border-slate-700/80 p-1 flex items-center justify-center hover:scale-110 hover:border-amber-400 transition-all cursor-pointer shadow-md"
                  title={`${emote.label} (${emote.description})`}
                >
                  <img
                    src={emote.image}
                    alt={emote.label}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

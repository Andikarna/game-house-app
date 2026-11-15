'use client';

import React, { useState, useEffect } from 'react';
import { GameHouseLogo } from '../../components/branding/GameHouseLogo';
import { Button } from '../../components/ui/Button';
import { HeroSection } from './HeroSection';
import { FeaturedGame } from './FeaturedGame';
import { ExploreGames } from './ExploreGames';
import { HowToPlay } from './HowToPlay';
import { CreateRoomModal } from './CreateRoomModal';
import { JoinRoomModal } from './JoinRoomModal';
import { ToastContainer } from '../../components/ui/ToastContainer';
import { useSocket } from '../../hooks/useSocket';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { Volume2, VolumeX, Sparkles, LogIn, Heart } from 'lucide-react';
import { GameId } from '@gamehouse/shared';

export const HomeContent: React.FC = () => {
  const socket = useSocket();
  const { isMuted, toggleMute } = useSettingsStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [stats, setStats] = useState({ onlinePlayers: 18, activeRooms: 4 });

  // Periodically fetch live server stats if available
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats({
              onlinePlayers: Math.max(12, data.stats.onlinePlayers),
              activeRooms: Math.max(2, data.stats.activeRooms),
            });
          }
        }
      } catch {
        // Fallback to active demo simulation numbers
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectGame = (gameId: GameId) => {
    setIsCreateOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col relative selection:bg-indigo-500 selection:text-white pb-20 sm:pb-0">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-background/85 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          <GameHouseLogo size="sm" className="scale-90 sm:scale-100 origin-left" />

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Mute Toggle */}
            <button
              onClick={toggleMute}
              className="p-2 sm:p-2.5 rounded-xl bg-surface-elevated border border-slate-700/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsJoinOpen(true)}
              icon={<LogIn className="w-4 h-4 text-indigo-400" />}
              className="text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Join Room</span>
              <span className="sm:hidden">Join</span>
            </Button>

            <Button
              variant="orange"
              size="sm"
              glow
              onClick={() => setIsCreateOpen(true)}
              icon={<Sparkles className="w-4 h-4" />}
              className="font-black text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Create Room</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Sections */}
      <main className="flex-1 flex flex-col">
        {/* 1. Hero Section */}
        <HeroSection
          onCreateRoom={() => setIsCreateOpen(true)}
          onJoinRoom={() => setIsJoinOpen(true)}
          onlinePlayers={stats.onlinePlayers}
          activeRooms={stats.activeRooms}
        />

        {/* 2. Featured Game: Panjat Pinang Battle */}
        <FeaturedGame onPlayNow={() => setIsCreateOpen(true)} />

        {/* 3. Explore Games Section (Modular Ecosystem) */}
        <ExploreGames onSelectGame={handleSelectGame} />

        {/* 4. How To Play Section */}
        <HowToPlay />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800 bg-surface/50 py-8 sm:py-10 px-4 sm:px-8 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <GameHouseLogo size="sm" />

          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for multiplayer party fun. Play Together. Compete Together.
          </p>

          <span className="text-xs text-slate-500">
            © 2026 GameHouse. All rights reserved.
          </span>
        </div>
      </footer>

      {/* Mobile Floating Bottom Bar for Quick Match Creation */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-slate-800 p-3 pb-safe z-30 flex items-center gap-2 shadow-2xl">
        <Button
          variant="secondary"
          size="md"
          onClick={() => setIsJoinOpen(true)}
          icon={<LogIn className="w-4 h-4 text-indigo-400" />}
          className="flex-1 font-bold"
        >
          Join Room
        </Button>

        <Button
          variant="orange"
          size="md"
          glow
          onClick={() => setIsCreateOpen(true)}
          icon={<Sparkles className="w-4 h-4" />}
          className="flex-1 font-black shadow-glow-orange"
        >
          Create Party
        </Button>
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      {/* Notification Toasts */}
      <ToastContainer />
    </div>
  );
};

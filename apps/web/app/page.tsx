import React from 'react';
import dynamic from 'next/dynamic';

const HomeContent = dynamic(
  () => import('../features/home/HomeContent').then((mod) => mod.HomeContent),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center animate-pulse mb-3 shadow-lg shadow-indigo-500/20">
          <span className="text-2xl">🎮</span>
        </div>
        <p className="text-slate-300 text-sm font-bold tracking-wide animate-pulse">
          Loading GameHouse...
        </p>
      </div>
    ),
  }
);

export default function HomePage() {
  return <HomeContent />;
}

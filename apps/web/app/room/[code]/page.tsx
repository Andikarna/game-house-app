import React from 'react';
import dynamic from 'next/dynamic';

const RoomContainer = dynamic(
  () => import('../../../features/room/RoomContainer').then((mod) => mod.RoomContainer),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center animate-pulse mb-3">
          <span className="text-xl">🎮</span>
        </div>
        <p className="text-slate-400 text-sm font-semibold animate-pulse">Entering Game Room...</p>
      </div>
    ),
  }
);

export function generateStaticParams() {
  return [];
}

export default function RoomPage({ params }: { params: { code: string } }) {
  const roomCode = params?.code || '';
  return <RoomContainer roomCode={roomCode.toUpperCase()} />;
}

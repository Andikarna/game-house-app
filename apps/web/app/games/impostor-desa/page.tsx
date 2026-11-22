'use client';

import React, { useState } from 'react';
import { ImpostorHomeScreen } from '../../../features/games/impostor-desa/components/ImpostorHomeScreen';
import { CreateRoomModal } from '../../../features/home/CreateRoomModal';
import { JoinRoomModal } from '../../../features/home/JoinRoomModal';
import { Modal } from '../../../components/ui/Modal';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { useRouter } from 'next/navigation';

export default function ImpostorDesaLandingPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);

  return (
    <>
      <ImpostorHomeScreen
        onPlayNow={() => setIsJoinOpen(true)}
        onCreateRoom={() => setIsCreateOpen(true)}
        onHowToPlay={() => setIsHowToPlayOpen(true)}
      />

      {/* Create Room Modal pre-selected with impostor-desa */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialGameId="impostor-desa"
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      {/* Cara Bermain Impostor Desa Modal */}
      <Modal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
        title="🌾 Cara Bermain I'amPostor"
      >
        <div className="p-4 sm:p-6 space-y-4 text-slate-200 text-xs sm:text-sm">
          <div className="bg-[#18352B] p-4 rounded-2xl border border-emerald-500/30 text-white">
            <h3 className="font-black text-amber-300 text-sm mb-1 uppercase tracking-wider">
              Tujuan Permainan
            </h3>
            <p className="leading-relaxed">
              Di desa yang damai, salah satu warga adalah Impostor! Warga desa harus menemukan sang penyamar, sementara sang Impostor harus bertahan atau menebak kata rahasia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl">
              <h4 className="font-black text-emerald-400 mb-1 flex items-center gap-1.5">
                <span>🌾 Warga Desa</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                <li>Tahu kata rahasia yang sama</li>
                <li>Beri 1 petunjuk yang berhubungan</li>
                <li>Temukan siapa yang pura-pura tahu</li>
                <li>Vote impostor di fase pemilihan</li>
              </ul>
            </div>

            <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl">
              <h4 className="font-black text-rose-400 mb-1 flex items-center gap-1.5">
                <span>😈 Impostor Desa</span>
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                <li>TIDAK tahu kata rahasianya</li>
                <li>Simak petunjuk warga lain</li>
                <li>Beri petunjuk umum agar tak dicurigai</li>
                <li>Jika tertangkap, tebak kata rahasia!</li>
              </ul>
            </div>
          </div>

          <div className="bg-surface-elevated p-3 rounded-xl border border-slate-700">
            <h4 className="font-bold text-amber-400 text-xs uppercase mb-1">
              Aturan Kamar (Room)
            </h4>
            <p className="text-xs text-slate-400">
              Setiap room berkapasitas <span className="font-black text-white">4 hingga 6 pemain</span>. Permainan hanya dapat dimulai bila minimal 4 pemain telah bergabung dan siap.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsHowToPlayOpen(false)}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-xs"
            >
              Mengerti, Siap Main!
            </button>
          </div>
        </div>
      </Modal>

      <ToastContainer />
    </>
  );
}

'use client';

import React, { useState } from 'react';
import { HiddenTeamHomeScreen } from '../../../features/games/hidden-team/components/HiddenTeamHomeScreen';
import { HiddenTeamRulesModal } from '../../../features/games/hidden-team/components/HiddenTeamRulesModal';
import { CreateRoomModal } from '../../../features/home/CreateRoomModal';
import { JoinRoomModal } from '../../../features/home/JoinRoomModal';
import { ToastContainer } from '../../../components/ui/ToastContainer';
import { useRouter } from 'next/navigation';

export default function HiddenTeamLandingPage() {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [autoFillBots, setAutoFillBots] = useState(false);

  const handleOpenCreate = (fillBots: boolean = false) => {
    setAutoFillBots(fillBots);
    setIsCreateOpen(true);
  };

  return (
    <>
      <HiddenTeamHomeScreen
        onPlayNow={() => setIsJoinOpen(true)}
        onCreateRoom={() => handleOpenCreate(false)}
        onPlaySolo={() => handleOpenCreate(true)}
        onHowToPlay={() => setIsHowToPlayOpen(true)}
      />

      {/* Create Room Modal pre-selected with hidden-team */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialGameId="hidden-team"
        initialAutoFillBots={autoFillBots}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />

      {/* Cara Bermain Hidden Team Modal */}
      <HiddenTeamRulesModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      <ToastContainer />
    </>
  );
}

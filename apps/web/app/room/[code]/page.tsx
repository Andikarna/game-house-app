'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RoomContainer } from '../../../features/room/RoomContainer';

export default function RoomPage() {
  const params = useParams();
  const roomCode = Array.isArray(params.code) ? params.code[0] : params.code || '';

  return <RoomContainer roomCode={roomCode.toUpperCase()} />;
}

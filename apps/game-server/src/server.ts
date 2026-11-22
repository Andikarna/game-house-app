import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';
import { setupSocketHandlers } from './socket/SocketHandler';
import { ClientToServerEvents, ServerToClientEvents } from '@gamehouse/shared';

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
app.use(cors({
  origin: '*', // Allow connections from frontend
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 10000,
  pingInterval: 5000,
});

const roomManager = new RoomManager(io);

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = roomManager.getStats();
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    stats,
  });
});

// API endpoint to query room info by code
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code;
  const room = roomManager.getRoomByCode(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({ 
    room: room.getInfo(),
    gameState: room.getGameState()
  });
});

// API endpoint to join room via HTTP
app.post('/api/rooms/join', (req, res) => {
  const { roomCode, code, nickname, avatar, playerId } = req.body || {};
  const targetCode = roomCode || code;
  const socketId = `http_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const result = roomManager.joinRoom(
    socketId,
    targetCode,
    { nickname: nickname || 'Player', avatar: avatar || 'budi', playerId }
  );
  if (!result.success || !result.room || !result.player) {
    return res.status(404).json({ success: false, error: result.error || 'Room not found' });
  }
  const roomInfo = result.room.getInfo();
  io.to(result.room.id).emit('room:updated', roomInfo);
  return res.json({
    success: true,
    room: roomInfo,
    player: result.player,
    playerId: result.player.id,
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io, roomManager);

server.listen(PORT, () => {
  console.log(`🎮 GameHouse Game Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for incoming connections`);
});

// Export server and instances for testing
export { app, server, io, roomManager };

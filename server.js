require('dotenv').config({ path: '.env.local' });
const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const cookie = require('cookie');
const { getRoom, addRoomMessage, getSession } = require('./lib/database.js');
const { sanitizeRoomSettings, normalizeRoomSettings } = require('./lib/roomSettings.js');

/** roomId -> Map(userId -> { displayName, sockets: Set<socketId> }) */
const presenceByRoom = new Map();

function presenceUsers(roomId) {
  const byUser = presenceByRoom.get(roomId);
  if (!byUser) return [];
  return Array.from(byUser.entries()).map(([id, { displayName }]) => ({
    id,
    displayName
  }));
}

function addSocketToPresence(roomId, userId, socketId, displayName) {
  if (!presenceByRoom.has(roomId)) presenceByRoom.set(roomId, new Map());
  const byUser = presenceByRoom.get(roomId);
  if (!byUser.has(userId)) {
    byUser.set(userId, { displayName, sockets: new Set() });
  }
  const entry = byUser.get(userId);
  entry.displayName = displayName;
  entry.sockets.add(socketId);
}

function removeSocketFromPresence(roomId, userId, socketId) {
  const byUser = presenceByRoom.get(roomId);
  if (!byUser) return;
  const entry = byUser.get(userId);
  if (!entry) return;
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) {
    byUser.delete(userId);
  }
  if (byUser.size === 0) {
    presenceByRoom.delete(roomId);
  }
}

function emitRoomState(io, roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  io.to(roomId).emit('room-state', {
    roomId,
    title: room.title,
    owner: room.owner,
    settings: normalizeRoomSettings(room.settings),
    users: presenceUsers(roomId),
    chat: room.chat
  });
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use((socket, next) => {
    const cookies = cookie.parse(socket.request.headers.cookie || '');
    const sessionId = cookies.wejam_session;
    if (!sessionId) {
      return next(new Error('AUTH_REQUIRED'));
    }
    const session = getSession(sessionId);
    if (!session) {
      return next(new Error('AUTH_REQUIRED'));
    }
    socket.data.user = { id: sessionId, profile: session.profile };
    next();
  });

  io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room-error', { message: 'Room not found.' });
        return;
      }
      socket.join(roomId);
      const displayName =
        socket.data.user.profile.display_name || socket.data.user.profile.id || 'Guest';
      addSocketToPresence(roomId, socket.data.user.id, socket.id, displayName);
      emitRoomState(io, roomId);
    });

    socket.on('send-message', ({ roomId, text }) => {
      const room = getRoom(roomId);
      if (!room) return;
      const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const author = socket.data.user.profile.display_name || 'Guest';
      const createdAt = new Date().toISOString();
      
      require('./lib/database.js').addRoomMessage(roomId, messageId, author, text);

      const message = { id: messageId, author, text: text.trim(), createdAt };
      io.to(roomId).emit('chat-message', message);
    });

    socket.on('update-settings', ({ roomId, settings }) => {
      if (!socket.rooms.has(roomId)) return;
      const room = getRoom(roomId);
      if (!room) return;
      const patch = sanitizeRoomSettings(settings);
      if (Object.keys(patch).length === 0) return;
      const merged = require('./lib/database.js').updateRoomSettings(roomId, patch);
      if (merged) {
        io.to(roomId).emit('room-settings', normalizeRoomSettings(merged));
      }
    });

    socket.on('disconnecting', () => {
      const roomsJoined = Array.from(socket.rooms).filter((room) => room !== socket.id);
      roomsJoined.forEach((roomId) => {
        if (!getRoom(roomId)) return;
        removeSocketFromPresence(roomId, socket.data.user.id, socket.id);
        emitRoomState(io, roomId);
      });
    });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const host = process.env.HOST || '0.0.0.0';
  httpServer.listen(port, host, () => {
    console.log(`WeJam service running on http://${host}:${port}`);
  });
});

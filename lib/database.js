const path = require('path');
const fs = require('fs');

const dataDir = path.join(process.cwd(), '.data');
const storePath = path.join(dataDir, 'wejam-store.json');

function emptyStore() {
  return { sessions: {}, rooms: {}, roomMessages: {} };
}

function readStoreFromDisk() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(storePath)) {
    return emptyStore();
  }
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const data = JSON.parse(raw);
    if (!data.sessions) data.sessions = {};
    if (!data.rooms) data.rooms = {};
    if (!data.roomMessages) data.roomMessages = {};
    return data;
  } catch {
    return emptyStore();
  }
}

/** In-memory store; persisted after each mutating call */
let cache = null;

function getStore() {
  if (!cache) {
    cache = readStoreFromDisk();
  }
  return cache;
}

function persist() {
  if (!cache) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(cache), 'utf8');
}

/** Compatibility shim (previously better-sqlite3 Database) */
const db = {
  engine: 'json-file',
  path: storePath,
  close() {}
};

function createSession(sessionId, data) {
  const store = getStore();
  const expiresAt = data.createdAt + 60 * 60 * 24 * 7 * 1000;
  store.sessions[sessionId] = {
    profile: data.profile,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
    createdAt: data.createdAt,
    expiresAt,
    tokenExpiresAt: data.tokenExpiresAt ?? null
  };
  persist();
  return { id: sessionId, ...data };
}

function getSession(sessionId) {
  const store = getStore();
  const row = store.sessions[sessionId];
  if (!row || row.expiresAt <= Date.now()) {
    if (row) {
      delete store.sessions[sessionId];
      persist();
    }
    return null;
  }
  return {
    profile: row.profile,
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    createdAt: row.createdAt,
    tokenExpiresAt: row.tokenExpiresAt ?? null
  };
}

function deleteSession(sessionId) {
  const store = getStore();
  if (store.sessions[sessionId]) {
    delete store.sessions[sessionId];
    persist();
  }
}

function createRoom(roomId, data) {
  const store = getStore();
  if (store.rooms[roomId]) {
    throw new Error('Room id collision');
  }
  store.rooms[roomId] = {
    id: roomId,
    ownerId: data.owner.id,
    ownerName: data.owner.displayName,
    title: data.title,
    settings: data.settings,
    createdAt: Date.now()
  };
  if (!store.roomMessages[roomId]) {
    store.roomMessages[roomId] = [];
  }
  persist();
  return {
    id: roomId,
    owner: data.owner,
    title: data.title,
    settings: data.settings,
    users: [],
    chat: []
  };
}

function getRoom(roomId) {
  const store = getStore();
  const row = store.rooms[roomId];
  if (!row) return null;

  const messages = (store.roomMessages[roomId] || [])
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-120);

  const settings =
    typeof row.settings === 'string' ? JSON.parse(row.settings) : { ...row.settings };

  return {
    id: row.id,
    owner: { id: row.ownerId, displayName: row.ownerName },
    title: row.title,
    settings,
    users: [],
    chat: messages.map((m) => ({
      id: m.id,
      author: m.author,
      text: m.text,
      createdAt: m.createdAt
    }))
  };
}

function addRoomMessage(roomId, messageId, author, text) {
  const store = getStore();
  if (!store.roomMessages[roomId]) {
    store.roomMessages[roomId] = [];
  }
  store.roomMessages[roomId].push({
    id: messageId,
    author,
    text,
    createdAt: new Date().toISOString()
  });
  if (store.roomMessages[roomId].length > 500) {
    store.roomMessages[roomId] = store.roomMessages[roomId].slice(-500);
  }
  persist();
}

function updateRoomSettings(roomId, partialSettings) {
  const store = getStore();
  const row = store.rooms[roomId];
  if (!row) return null;
  const current =
    typeof row.settings === 'string' ? JSON.parse(row.settings) : { ...row.settings };
  const merged = { ...current, ...partialSettings };
  row.settings = merged;
  persist();
  return merged;
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  createRoom,
  getRoom,
  addRoomMessage,
  updateRoomSettings,
  db
};

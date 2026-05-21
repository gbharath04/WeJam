const rooms = new Map();
const sessions = new Map();

function createRoom({ id, owner, title, settings }) {
  rooms.set(id, {
    id,
    owner,
    title,
    settings,
    users: [],
    chat: []
  });
  return rooms.get(id);
}

function createSession(sessionId, data) {
  sessions.set(sessionId, data);
  return sessions.get(sessionId);
}

module.exports = {
  rooms,
  sessions,
  createRoom,
  createSession
};

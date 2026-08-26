/**
 * HeartLink — SocketService
 * Singleton Socket.io client — connect once, use everywhere.
 */
import { io } from 'socket.io-client';
import { ApiIPAddress } from 'utils/apiIPAdrees';


const SOCKET_URL = ApiIPAddress.replace('/api', ''); // http://10.x.x.x:5000

class SocketService {
  constructor() {
    this.socket   = null;
    this.userId   = null;
    this.handlers = {}; // event → [callbacks]
  }

  // ── Connect and identify user ─────────────────────────────────────────────
  // `token` is required — the server verifies it (same JWT as REST calls) and
  // derives the socket's identity from it. It no longer trusts a client-
  // supplied userId, so passing one without a valid token will just get the
  // connection rejected (see server.js io.use() auth middleware).
  connect(userId, token) {
    if (this.socket?.connected && this.userId === userId) return;
    if (!token) {
      console.log('❌ [Socket] Cannot connect: no auth token available.');
      return;
    }

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      auth:               { token },
      transports:        ['websocket'],
      reconnection:      true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('🔌 [Socket] Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.log('❌ [Socket] Connection error:', err.message);
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔄 [Socket] Reconnected after ${attempt} attempts`);
      // No re-join emit needed — the server re-authenticates and re-joins
      // this socket's personal room automatically on every new connection.
    });
  }

  // ── Disconnect ────────────────────────────────────────────────────────────
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket   = null;
      this.userId   = null;
      this.handlers = {};
      console.log('🔌 [Socket] Disconnected cleanly');
    }
  }

  // ── Join a chat room ──────────────────────────────────────────────────────
  // NOTE: `userId` (own id) params below are kept in the method signatures so
  // existing call sites don't need to change, but are no longer sent on the
  // wire — the server derives "who is this" from the authenticated socket
  // (see server.js), never from a client-supplied field.
  joinRoom(_userId, otherUserId) {
    if (!this.socket?.connected) return;
    this.socket.emit('chat:join', { otherUserId });
  }

  // ── Send a message ────────────────────────────────────────────────────────
  sendMessage(_senderId, receiverId, message, tempId) {
    if (!this.socket?.connected) return;
    this.socket.emit('message:send', { receiverId, message, tempId });
  }

  // ── Typing indicators ─────────────────────────────────────────────────────
  startTyping(_senderId, receiverId) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', { receiverId });
  }

  stopTyping(_senderId, receiverId) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:stop', { receiverId });
  }

  // ── Mark messages as read ─────────────────────────────────────────────────
  markAsRead(_readerId, senderId) {
    if (!this.socket?.connected) return;
    this.socket.emit('message:read', { senderId });
  }

  // ── Listen for incoming messages ──────────────────────────────────────────
  onMessage(callback) {
    this.socket?.on('message:receive', callback);
  }

  offMessage() {
    this.socket?.off('message:receive');
  }

  // ── Listen for typing ─────────────────────────────────────────────────────
  onTypingStart(callback) {
    this.socket?.on('typing:start', callback);
  }

  onTypingStop(callback) {
    this.socket?.on('typing:stop', callback);
  }

  offTyping() {
    this.socket?.off('typing:start');
    this.socket?.off('typing:stop');
  }

  // ── Listen for conversation updates (MessagesScreen badge) ────────────────
  onConversationUpdate(callback) {
    this.socket?.on('conversation:update', callback);
  }

  offConversationUpdate() {
    this.socket?.off('conversation:update');
  }

  // ── Listen for read receipts ──────────────────────────────────────────────
  onMessageRead(callback) {
    this.socket?.on('message:read', callback);
  }

  offMessageRead() {
    this.socket?.off('message:read');
  }

  // ── Online/offline status ─────────────────────────────────────────────────
  onUserOnline(callback) {
    this.socket?.on('user:online', callback);
  }

  onUserOffline(callback) {
    this.socket?.on('user:offline', callback);
  }

  offOnlineStatus() {
    this.socket?.off('user:online');
    this.socket?.off('user:offline');
  }

  // ── Check connection ──────────────────────────────────────────────────────
  isConnected() {
    return this.socket?.connected ?? false;
  }
}

// Export singleton
export default new SocketService();
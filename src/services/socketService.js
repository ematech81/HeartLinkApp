/**
 * HeartLink Socket Service
 * Real-time messaging via Socket.io.
 */

import { io } from 'socket.io-client';
import StorageService from './storageServices';
import { API_BASE_URL } from 'src/constants/appConstants';


const BASE_URL = API_BASE_URL.replace('/api', '');

let socket = null;

const SocketService = {
  /**
   * Connect to the socket server with the user's auth token.
   */
  connect: async () => {
    const token = await StorageService.get(StorageKeys.AUTH_TOKEN);
    if (socket?.connected) return socket;

    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => socket,

  isConnected: () => socket?.connected ?? false,

  // ─── Emit helpers ────────────────────────────────────────────────────────────

  goOnline: (userId) => socket?.emit('user:online', userId),

  joinRoom: (userId) => socket?.emit('room:join', userId),

  sendMessage: (senderId, receiverId, message) =>
    socket?.emit('message:send', { senderId, receiverId, message }),

  startTyping: (senderId, receiverId) =>
    socket?.emit('typing:start', { senderId, receiverId }),

  stopTyping: (senderId, receiverId) =>
    socket?.emit('typing:stop', { senderId, receiverId }),

  // ─── Listener helpers ────────────────────────────────────────────────────────

  onMessage: (callback) => socket?.on('message:receive', callback),
  onTypingStart: (callback) => socket?.on('typing:start', callback),
  onTypingStop: (callback) => socket?.on('typing:stop', callback),
  onOnlineUsers: (callback) => socket?.on('users:online', callback),

  offMessage: () => socket?.off('message:receive'),
  offTyping: () => { socket?.off('typing:start'); socket?.off('typing:stop'); },
};

export default SocketService;
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000';

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string) => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      set({ isConnected: false });
    });

    set({ socket });
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  emit: (event: string, data: any) => {
    const socket = get().socket;
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  },

  on: (event: string, handler: (data: any) => void) => {
    const socket = get().socket;
    if (socket) {
      socket.on(event, handler);
    }
  },

  off: (event: string) => {
    const socket = get().socket;
    if (socket) {
      socket.off(event);
    }
  },
}));


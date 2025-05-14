"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext'; 

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL!;

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emitWithAck: <T, R>(eventName: string, data: T) => Promise<R>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (user?.userId && (!socket || socketInitializedRef.current !== user.userId)) {
      // Cleanup any existing socket first
      if (socket) {
        console.log('SocketContext: Cleaning up existing socket before creating new one');
        socket.disconnect();
      }
      
      console.log(`SocketContext: Attempting to connect for user ${user.userId}`);
      socketInitializedRef.current = user.userId;
      
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        auth: { userId: user.userId },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('SocketContext: Connected! Socket ID:', newSocket.id);
        setIsConnected(true);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('SocketContext: Disconnected.', reason);
        setIsConnected(false);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('SocketContext: Connection Error!', error.message, (error as any)?.data || '');
        setIsConnected(false);
      });
      
      newSocket.on('gameError', (data: { message: string }) => {
        console.error('SocketContext: Received gameError:', data.message);
        alert(`Server error: ${data.message}`);
      });

      setSocket(newSocket);
    } else if (!user?.userId && socket) {
      console.log('SocketContext: User logged out, disconnecting socket.');
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      socketInitializedRef.current = null;
    }
    
    return () => {
      if (socket && typeof window !== 'undefined') {
        const unmounting = !document.body.contains(document.getElementById('socket-provider'));
        if (unmounting) {
          console.log('SocketContext: Component truly unmounting, cleaning up socket connection.');
          socket.disconnect();
          setSocket(null);
          setIsConnected(false);
          socketInitializedRef.current = null;
        }
      }
    };
  }, [user?.userId]);

  // Helper for emitting with acknowledgement
  const emitWithAck = useCallback(async <T, R>(eventName: string, data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        console.error(`Socket not connected or available for event: ${eventName}`);
        return reject(new Error('Socket not connected.'));
      }
      
      socket.emit(eventName, data, (response: R) => {
        const res = response as any; // Type assertion
        if (res.error) {
          console.error(`Error from server on event ${eventName}:`, res.error);
          reject(res.error);
        } else {
          resolve(response);
        }
      });
    });
  }, [socket, isConnected]);

  const contextValue = {
    socket,
    isConnected,
    emitWithAck
  };

  return (
    <div id="socket-provider">
      <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>
    </div>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
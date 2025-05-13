"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from './UserContext'; // To get userId for auth

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
  
  // Use a ref to track if we've already created a socket for this user
  const socketInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only create a new socket if:
    // 1. We have a user with userId
    // 2. We don't already have a socket
    // 3. The current user is different from the one we created a socket for
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
        // Add transports to prefer WebSocket
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
        // Use a toast notification library here for better UX
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
    
    // Cleanup function
    return () => {
      // Only run cleanup if component is truly unmounting
      // We use a nested check to avoid unnecessary disconnections
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
  }, [user?.userId]); // Only depend on userId, not the entire user object or socket

  // Helper for emitting with acknowledgement
  const emitWithAck = useCallback(async <T, R>(eventName: string, data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!socket || !isConnected) {
        console.error(`Socket not connected or available for event: ${eventName}`);
        return reject(new Error('Socket not connected.'));
      }
      
      socket.emit(eventName, data, (response: R) => {
        // Assuming backend callback has { error: string } or { success: true, ...data }
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
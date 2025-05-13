// context/UserContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import apiClient from '@/lib/apiClient'; // Adjust path
import VectorClock from '@/lib/vectorClock'; // Adjust path

export interface AvatarFeatures { 
  color: string;
  face: string;
  hat: string;
  accessory: string;
}

export interface User { 
  userId: string;
  username: string;
  avatar: AvatarFeatures;
  currentRoomId?: string | null;
  socketId?: string | null;
  lastSeen?: string; 
  createdAt?: string;
  updatedAt?: string;
}

interface UserContextType {
  user: User | null;
  vectorClock: VectorClock | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, avatarDetails: AvatarFeatures) => Promise<User | null>;
  updateUserInContext: (updatedUserData: User) => void; // New function
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('scribbleUser');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  });
  const [vectorClock, setVectorClock] = useState<VectorClock | null>(() => {
    if (user?.userId) { // Initialize VC if user was loaded from localStorage
        return new VectorClock(user.userId);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);


  const login = useCallback(async (username: string, avatarDetails: AvatarFeatures): Promise<User | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/users/register', {
        username,
        avatarDetails
      });
      const userData: User = response.data.user;
      setUser(userData);
      setVectorClock(new VectorClock(userData.userId));
      if (typeof window !== 'undefined') {
        localStorage.setItem('scribbleUser', JSON.stringify(userData));
      }
      setIsLoading(false);
      return userData;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login/Registration failed';
      console.error('Login/Registration failed:', errorMessage, err.response?.data);
      setError(errorMessage);
      setIsLoading(false);
      return null;
    }
  }, []);
  
  const updateUserInContext = useCallback((updatedUserData: User) => {
    setUser(updatedUserData);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scribbleUser', JSON.stringify(updatedUserData));
    }
    // VC nodeId should not change, so no need to re-init VC unless userId changed (which it shouldn't here)
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setVectorClock(null);
    setIsLoading(false);
    setError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('scribbleUser');
      // Consider also clearing other game-related localStorage items
    }
    // Add logic to disconnect socket if managed here or in SocketContext
    // (e.g., socket?.disconnect() if socket instance is accessible)
  }, []);

  const contextValue = useMemo(() => ({ user, vectorClock, isLoading, error, login, updateUserInContext, logout }), [user, vectorClock, isLoading, error, login, updateUserInContext, logout]);

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
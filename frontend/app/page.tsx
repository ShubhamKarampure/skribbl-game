"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import AnimatedLogo from "@/components/ui/animated-logo";
import AvatarCustomizer from "@/components/game/avatar/avatar-customizer";
import BackgroundCanvas from "@/components/ui/background-canvas";
import { useRouter } from "next/navigation";
import { Users, Plus, Settings } from "lucide-react";
import { useUser, AvatarFeatures, User } from "@/context/UserContext";
import apiClient from "@/lib/apiClient";

const DEFAULT_AVATAR: AvatarFeatures = {
  color: "#3b82f6",
  face: "neutral",
  hat: "none",
  accessory: "none",
};

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [currentAvatarFeatures, setCurrentAvatarFeatures] = useState<AvatarFeatures>(DEFAULT_AVATAR);
  const [pageError, setPageError] = useState<string | null>(null);

  // Loading states for each button
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  // Modal state
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [lobbyId, setLobbyId] = useState("");

  const router = useRouter();
  const { user, login, updateUserInContext, isLoading, error: userContextError } = useUser();

  useEffect(() => {
    if (user && user.avatar) {
      setCurrentAvatarFeatures(user.avatar);
    } else {
      setCurrentAvatarFeatures(DEFAULT_AVATAR);
    }
  }, [user]);

  const handleAvatarChange = useCallback((features: AvatarFeatures) => {
    setCurrentAvatarFeatures(features);
  }, []);

  const ensureUserReady = async (): Promise<User | null> => {
    if (!playerName.trim()) {
      setPageError("Please enter your name first.");
      return null;
    }
    setPageError(null);

    const currentUserDetails = await login(playerName.trim(), currentAvatarFeatures);
    return currentUserDetails;
  };

  const handleNavigateToCreateRoom = async () => {
    setLoadingCreate(true);
    const readyUser = await ensureUserReady();
    const createdRoom = await apiClient.post("/rooms", { userId: readyUser?.userId });
    console.log("Created room:", createdRoom);
    setLoadingCreate(false);
    if (readyUser && createdRoom) {
      updateUserInContext({ ...readyUser, currentRoomId: createdRoom.data.room.roomId });
      router.push(`/lobby/${createdRoom.data.room.roomId}`);
    }
  };

  const handleOpenLobbyModal = () => {
    setShowLobbyModal(true);
    setLobbyId("");
  };

  const handleNavigateToLobby = async (id: string) => {
    setLoadingJoin(true);
  
    try {
      const readyUser = await ensureUserReady();
      
      if (readyUser?.userId) {
        const response = await apiClient.post(`/rooms/${id}/join`, { userId: readyUser.userId });
        console.log("Joined room:", response.data);
        
        setLoadingJoin(false);
        if (readyUser && id.trim()) {
          setShowLobbyModal(false);
          router.push(`/lobby/${id}`); // Navigate to the lobby page
        }
      } else {
        console.log("User is not ready");
      }
    } catch (error) {
      setLoadingJoin(false);
      console.error("Error joining room:", error);
    }
  };

  // LobbyIdModal moved inside Home to access state directly
  function LobbyIdModal({ open }: { open: boolean }) {
    useEffect(() => { if (!open) setLobbyId(""); }, [open]);
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-lg p-6 w-80 flex flex-col gap-4">
          <h2 className="text-lg font-bold mb-2 text-gray-800">Enter Lobby ID</h2>
          <Input
            type="text"
            placeholder="Lobby ID"
            value={lobbyId}
            onChange={e => setLobbyId(e.target.value)}
            disabled={loadingJoin}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowLobbyModal(false)} disabled={loadingJoin}>Cancel</Button>
            <Button
              onClick={() => handleNavigateToLobby(lobbyId)}
              disabled={!lobbyId.trim() || loadingJoin}
            >
              {loadingJoin ? (
                <motion.div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              ) : "Join"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <BackgroundCanvas />

      <LobbyIdModal open={showLobbyModal} />

      <motion.div
        className="z-10 w-full max-w-md sm:max-w-lg mx-auto flex flex-col items-center justify-center gap-6 my-8 sm:my-12 p-6 sm:p-8 bg-gradient-to-b from-blue-900/90 to-indigo-900/90 rounded-lg backdrop-blur-sm border border-blue-700/50 shadow-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedLogo />

        <motion.div
          className="w-full"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <AvatarCustomizer
            initialAvatar={currentAvatarFeatures}
            onAvatarChange={handleAvatarChange}
          />
        </motion.div>

        <motion.div
          className="w-full space-y-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Input
            type="text"
            placeholder="Enter your name"
            className="w-full bg-white/90 text-black placeholder-gray-500"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading || loadingCreate || loadingJoin}
          />
        </motion.div>

        {(pageError || userContextError) && (
          <motion.p
            className="text-red-300 text-sm text-center p-2 bg-red-900/50 rounded-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {pageError || userContextError}
          </motion.p>
        )}

        <motion.div
          className="w-full space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 hover:shadow-lg py-3 text-lg flex items-center justify-center gap-2"
              onClick={handleNavigateToCreateRoom}
              disabled={isLoading || loadingCreate || loadingJoin || !playerName.trim()}
            >
              {loadingCreate ? (
                <motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <Plus className="h-5 w-5" />}
              Create Room
            </Button>

            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-300 hover:shadow-lg py-3 text-lg flex items-center justify-center gap-2"
              onClick={handleOpenLobbyModal}
              disabled={isLoading || loadingCreate || loadingJoin || !playerName.trim()}
            >
              {loadingJoin ? (
                <motion.div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <Users className="h-5 w-5" />}
              Join Room
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full text-blue-200 hover:text-white hover:bg-blue-800/50 flex items-center justify-center gap-2"
            onClick={() => alert("Settings page not yet implemented.")}
            disabled={isLoading || loadingCreate || loadingJoin}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}

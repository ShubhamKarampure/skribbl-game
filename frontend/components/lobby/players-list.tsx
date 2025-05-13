"use client"

import { motion } from "framer-motion"
import PixelAvatar from "@/components/game/avatar/pixel-avatar"
import type { PlayerInLobby } from "@/types/index"

interface PlayersListProps {
  players: PlayerInLobby[]
  creatorId: string
  currentUserId: string
}

export default function PlayersList({ players, creatorId, currentUserId }: PlayersListProps) {
  // Helper function to check if a player is the creator/host
  const isPlayerCreator = (playerId: string) => {
    return creatorId === playerId
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
      {players.map((player) => (
        <motion.div
          key={player.userId}
          className={`flex items-center p-3 rounded-lg ${
            isPlayerCreator(player.userId)
              ? "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 shadow-md"
              : "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
          <div className="mr-3 relative">
            <div
              className={`absolute inset-0 rounded-full ${isPlayerCreator(player.userId) ? "bg-yellow-200" : "bg-blue-200"} blur-sm opacity-50`}
            ></div>
            <div className="relative">
              <PixelAvatar features={player.avatar} size="sm" />
            </div>
          </div>
          <div>
            <div className={`font-medium ${isPlayerCreator(player.userId) ? "text-amber-800" : "text-blue-900"}`}>
              {player.username}
              {player.userId === currentUserId && (
                <span className="text-xs ml-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">You</span>
              )}
              {isPlayerCreator(player.userId) && (
                <span className="text-xs ml-1 font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  Host ⭐
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

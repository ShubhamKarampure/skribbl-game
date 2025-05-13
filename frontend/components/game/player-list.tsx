"use client"

import { motion } from "framer-motion"
import PixelAvatar from "./avatar/pixel-avatar"
import type { AvatarFeatures } from "@/types/avatar"

// Updated interface to match the game-play-page requirements
interface Player {
  userId: string
  username: string
  avatar: AvatarFeatures
  score: number
  isOnline: boolean
  isCreator?: boolean
}

interface PlayerListProps {
  players: Player[]
  currentUserId: string
  drawerId: string | null
}

export default function PlayerList({ players, currentUserId, drawerId }: PlayerListProps) {
  return (
    <div className="space-y-2 overflow-y-auto">
      {players.map((player, index) => (
        <motion.div
          key={player.userId}
          className={`flex items-center p-2 rounded-lg ${
            player.userId === drawerId ? "bg-yellow-100 border border-yellow-300" : "bg-gray-50"
          } ${player.userId === currentUserId ? "border-blue-300 border" : ""}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="mr-3">
            <PixelAvatar features={player.avatar} size="sm" isDrawing={player.userId === drawerId} />
          </div>

          <div className="flex-1">
            <div className="font-medium">
              {player.username}
              {player.userId === currentUserId && <span className="ml-1 text-xs text-blue-500">(You)</span>}
              {player.userId === drawerId && (
                <motion.span
                  className="ml-2 text-xs bg-yellow-500 text-white px-1 py-0.5 rounded"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Drawing
                </motion.span>
              )}
              {player.isCreator && (
                <motion.span
                  className="ml-2 text-xs bg-purple-500 text-white px-1 py-0.5 rounded"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  Host
                </motion.span>
              )}
            </div>
            <div className="text-sm text-gray-500">Score: {player.score}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

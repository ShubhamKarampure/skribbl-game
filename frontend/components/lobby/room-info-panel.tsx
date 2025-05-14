"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MessageSquare, Play } from "lucide-react"
import type { LobbyRoomDetails } from "@/types/index"
import AnimatedGradientBorder from "../ui/animated-gradient-border"

interface RoomInfoPanelProps {
  roomDetails: LobbyRoomDetails
  roomId: string
  isCurrentUserCreator: boolean
  onStartGame: () => void
  onRestartGame?: () => void
  isLoading: boolean
}

export default function RoomInfoPanel({
  roomDetails,
  roomId,
  isCurrentUserCreator,
  onStartGame,
  onRestartGame,
  isLoading,
}: RoomInfoPanelProps) {
  const getCreatorUsername = () => {
    if (!roomDetails) return "N/A"
    const creator = roomDetails.players.find((p) => p.userId === roomDetails.creatorId)
    return creator ? creator.username : "N/A"
  }

  const minPlayersToStart = Number(process.env.NEXT_PUBLIC_MIN_PLAYERS_TO_START) || 2

  return (
    <div className="md:w-1/3 flex flex-col gap-4">
      <motion.div
        className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-xl text-white shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Room Info
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center bg-blue-500/30 p-2 rounded-lg">
            <span className="text-blue-100">ID:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">{roomId.toUpperCase()}</span>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-white hover:bg-blue-500/30"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                Copy
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center bg-blue-500/30 p-2 rounded-lg">
            <span className="text-blue-100">Players:</span>
            <span className="font-medium">
              {roomDetails.players.length} / {roomDetails.maxPlayers}
            </span>
          </div>

          <div className="flex justify-between items-center bg-blue-500/30 p-2 rounded-lg">
            <span className="text-blue-100">Host:</span>
            <span className="font-medium">{getCreatorUsername()}</span>
          </div>

          <div className="my-2 border-t border-blue-500/50"></div>

          <div className="flex justify-between items-center bg-blue-500/30 p-2 rounded-lg">
            <span className="text-blue-100">Rounds:</span>
            <span className="font-medium">{roomDetails.settings.rounds}</span>
          </div>

          <div className="flex justify-between items-center bg-blue-500/30 p-2 rounded-lg">
            <span className="text-blue-100">Draw Time:</span>
            <span className="font-medium">{roomDetails.settings.drawTime}s</span>
          </div>
        </div>
      </motion.div>

      {/* Start Game Button */}
      {isCurrentUserCreator && roomDetails.status === "waiting" && (
        <motion.div
          className="mt-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <AnimatedGradientBorder borderWidth={2} animationDuration={5}>
            <Button
              onClick={onStartGame}
              disabled={isLoading || roomDetails.players.length < minPlayersToStart}
              className="w-full py-5 text-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg flex items-center justify-center gap-2 rounded-xl"
            >
              <Play className="h-6 w-6" /> Start Game
            </Button>
          </AnimatedGradientBorder>

          {roomDetails.players.length < minPlayersToStart && (
            <motion.p
              className="text-xs text-center text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              Need at least {minPlayersToStart} players to start
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Waiting message for non-creator */}
      {!isCurrentUserCreator && roomDetails.status === "waiting" && (
        <motion.div
          className="mt-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-center shadow-md">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse h-2 w-2 bg-blue-200 rounded-full"></div>
              <div className="animate-pulse h-2 w-2 bg-blue-200 rounded-full" style={{ animationDelay: "0.2s" }}></div>
              <div className="animate-pulse h-2 w-2 bg-blue-200 rounded-full" style={{ animationDelay: "0.4s" }}></div>
            </div>
            <p className="mt-2">
              Waiting for host <b>{getCreatorUsername()}</b> to start...
            </p>
          </div>
        </motion.div>
      )}

      {/* Game status display */}
      {roomDetails.status !== "waiting" && (
        <motion.div
          className="mt-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="p-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg text-center shadow-md">
            Game is {roomDetails.status}
          </div>
        </motion.div>
      )}

      {/* Restart Game Button */}
      {isCurrentUserCreator && roomDetails.status === "finished" && (
        <motion.div
          className="mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <AnimatedGradientBorder borderWidth={2} animationDuration={5}>
            <Button
              onClick={onStartGame}
              disabled={isLoading}
              className="w-full py-5 text-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg flex items-center justify-center gap-2 rounded-xl"
            >
              <Play className="h-6 w-6" /> Restart Game
            </Button>
          </AnimatedGradientBorder>
        </motion.div>
      )}
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface GamePlayer {
  userId: string
  username: string
  score: number
  [key: string]: any
}

interface GameSummaryProps {
  players: GamePlayer[]
  onReturnToLobby: () => void
  onLeaveGame: () => void
}

export default function GameSummary({ players, onReturnToLobby, onLeaveGame }: GameSummaryProps) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-100 to-indigo-100 p-4">
      <motion.div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Game Over!</h1>
        <h2 className="text-xl font-semibold mb-4">Final Scores</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {[...players]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => (
              <div key={player.userId} className="flex justify-between py-1 border-b border-gray-100">
                <span>
                  {index + 1}. {player.username}
                </span>
                <span>{player.score || 0} pts</span>
              </div>
            ))}
        </div>
        <div className="flex space-x-4 mt-8">
          <Button variant="outline" onClick={onReturnToLobby} className="flex-1 py-2">
            Return to Lobby
          </Button>
          <Button onClick={onLeaveGame} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700">
            Exit Game
          </Button>
        </div>
      </motion.div>
    </main>
  )
}

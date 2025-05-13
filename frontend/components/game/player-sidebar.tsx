"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import PlayerList from "@/components/game/player-list"

interface PlayerSidebarProps {
  players: any[]
  currentUserId: string
  drawerId: string | null
  roundNumber: number
  totalRounds: number
  onLeaveGame: () => void
}

export default function PlayerSidebar({
  players,
  currentUserId,
  drawerId,
  roundNumber,
  totalRounds,
  onLeaveGame,
}: PlayerSidebarProps) {
  return (
    <motion.div className="lg:col-span-1 bg-white rounded-lg shadow p-2 sm:p-4 flex flex-col h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] border border-blue-100">
      <div className="flex items-center justify-between mb-2 text-xs sm:text-sm text-gray-500">
        <span>
          Round {roundNumber} of {totalRounds}
        </span>
      </div>
      <PlayerList players={players} currentUserId={currentUserId} drawerId={drawerId} />
      <div className="mt-auto pt-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onLeaveGame}>
          Leave Game
        </Button>
      </div>
    </motion.div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"

interface LobbyHeaderProps {
  roomId: string
  onLeaveLobby: () => void
}

export default function LobbyHeader({ roomId, onLeaveLobby }: LobbyHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <motion.h1
        className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        Game Lobby: <span className="font-mono">{roomId.toUpperCase()}</span>
      </motion.h1>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Button
          variant="outline"
          onClick={onLeaveLobby}
          className="flex items-center gap-2 text-sm border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </motion.div>
    </div>
  )
}

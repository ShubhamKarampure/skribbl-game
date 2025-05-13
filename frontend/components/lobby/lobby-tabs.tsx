"use client"

import { Users, Settings } from "lucide-react"
// Import motion from framer-motion
import { motion } from "framer-motion"

interface LobbyTabsProps {
  activeTab: "players" | "settings"
  setActiveTab: (tab: "players" | "settings") => void
  playersCount: number
  isCreator: boolean
  roomStatus: string
}

export default function LobbyTabs({ activeTab, setActiveTab, playersCount, isCreator, roomStatus }: LobbyTabsProps) {
  // Update the tabs component with animations
  return (
    <div className="flex border-b border-blue-100 mb-4">
      <motion.button
        className={`px-4 py-3 font-medium flex items-center gap-2 text-sm relative ${
          activeTab === "players" ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
        }`}
        onClick={() => setActiveTab("players")}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Users className="h-4 w-4" /> Players ({playersCount})
        {activeTab === "players" && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
            layoutId="activeTab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.button>

      {isCreator && roomStatus === "waiting" && (
        <motion.button
          className={`px-4 py-3 font-medium flex items-center gap-2 text-sm relative ${
            activeTab === "settings" ? "text-blue-600" : "text-gray-500 hover:text-blue-500"
          }`}
          onClick={() => setActiveTab("settings")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings className="h-4 w-4" /> Game Settings
          {activeTab === "settings" && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              layoutId="activeTab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>
      )}
    </div>
  )
}

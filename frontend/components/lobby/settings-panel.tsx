"use client"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import type { LobbyRoomSettings } from "@/types/index"
import { motion } from "framer-motion"

interface SettingsPanelProps {
  localSettings: LobbyRoomSettings
  setLocalSettings: (settings: LobbyRoomSettings) => void
  settingsHaveChanged: boolean
  onSaveSettings: () => void
}

export default function SettingsPanel({
  localSettings,
  setLocalSettings,
  settingsHaveChanged,
  onSaveSettings,
}: SettingsPanelProps) {
  // Update the settings panel with improved styling
  return (
    <div className="p-5 rounded-lg">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Rounds</label>
            <span className="text-blue-600 font-medium text-lg">{localSettings.rounds}</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Slider
              value={[localSettings.rounds]}
              min={1}
              max={10}
              step={1}
              onValueChange={(value) => setLocalSettings({ ...localSettings, rounds: value[0] })}
              className="py-1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Draw Time</label>
            <span className="text-blue-600 font-medium text-lg">{localSettings.drawTime}s</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Slider
              value={[localSettings.drawTime]}
              min={30}
              max={180}
              step={10}
              onValueChange={(value) => setLocalSettings({ ...localSettings, drawTime: value[0] })}
              className="py-1"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30s</span>
              <span>105s</span>
              <span>180s</span>
            </div>
          </div>
        </motion.div>

        {settingsHaveChanged ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              onClick={onSaveSettings}
              className="w-full py-3 mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md"
            >
              Save Settings
            </Button>
          </motion.div>
        ) : (
          <motion.p
            className="text-sm text-gray-500 text-center mt-4 bg-gray-50 p-2 rounded-lg border border-gray-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Settings are up-to-date
          </motion.p>
        )}
      </div>
    </div>
  )
}

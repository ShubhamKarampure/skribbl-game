"use client"

import { motion } from "framer-motion"

interface GameTimerProps {
  timeLeft: number
  totalTime: number
}

export default function GameTimer({ timeLeft, totalTime }: GameTimerProps) {
  const percentage = (timeLeft / totalTime) * 100
  const isLowTime = timeLeft <= 10

  return (
    <div className="flex flex-col items-center">
      <div className="text-sm text-gray-500 mb-1">Time Left</div>
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />

          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isLowTime ? "#ef4444" : "#3b82f6"}
            strokeWidth="8"
            strokeDasharray="283"
            strokeDashoffset={283 - (283 * percentage) / 100}
            transform="rotate(-90 50 50)"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Time text */}
        <motion.div
          className={`absolute text-2xl font-bold ${isLowTime ? "text-red-500" : "text-blue-600"}`}
          animate={{ scale: isLowTime && timeLeft <= 5 ? [1, 1.1, 1] : 1 }}
          transition={{ duration: 0.5, repeat: isLowTime && timeLeft <= 5 ? Number.POSITIVE_INFINITY : 0 }}
        >
          {Math.max(0, Math.floor(timeLeft))}
        </motion.div>
      </div>
    </div>
  )
}

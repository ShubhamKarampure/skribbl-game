"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"

interface WordSelectionModalProps {
  isOpen: boolean
  wordChoices?: string[] // optional to allow safety check
  onSelect: (word: string) => void
  onClose: () => void
  timeLimit?: number
}

export default function WordSelectionModal({
  isOpen,
  wordChoices = [], // default to empty array
  onSelect,
  onClose,
  timeLimit = 15,
}: WordSelectionModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [isHovering, setIsHovering] = useState<number | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(null)
      setTimeLeft(timeLimit)
    }
  }, [isOpen, timeLimit])

  // Timer countdown
  useEffect(() => {
    if (!isOpen || selectedIndex !== null) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          const randomIndex = Math.floor(Math.random() * wordChoices.length)
          setSelectedIndex(randomIndex)
          onSelect(wordChoices[randomIndex])
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, selectedIndex, wordChoices, onSelect])

  // Handle word selection
  const handleSelectWord = (index: number) => {
    setSelectedIndex(index)
    onSelect(wordChoices[index])
  }

  if (!isOpen || !Array.isArray(wordChoices) || wordChoices.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">Choose a word to draw!</h2>
            <p className="text-gray-500">Time remaining: {timeLeft}s</p>

            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: "100%" }}
                animate={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <div className="grid gap-4 mb-6">
            {wordChoices.map((word, index) => (
              <motion.button
                key={word}
                className={`p-4 rounded-lg text-xl font-bold text-center transition-all ${
                  selectedIndex === index
                    ? "bg-green-500 text-white"
                    : isHovering === index
                      ? "bg-blue-100 shadow-md"
                      : "bg-gray-100 hover:bg-blue-50"
                }`}
                onClick={() => handleSelectWord(index)}
                onMouseEnter={() => setIsHovering(index)}
                onMouseLeave={() => setIsHovering(null)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                {word}
              </motion.button>
            ))}
          </div>

          <div className="flex justify-between">
            {selectedIndex !== null && (
              <Button onClick={onClose} className="w-full">
                Start Drawing
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

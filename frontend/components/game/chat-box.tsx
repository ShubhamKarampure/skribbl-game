"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"

// Updated interface to match the game-play-page requirements
interface ChatMessage {
  type: "chat" | "guess" | "system"
  userId: string
  username: string
  message: string
  isCorrect?: boolean
  timestamp?: string
  vectorTimestamp?: Record<string, number>
}

interface ChatBoxProps {
  chatMessages: ChatMessage[]
  onSendMessage: (message: string, isGuess: boolean) => void
  currentUserId: string
  isDrawing: boolean
  isGamePlaying: boolean
  currentDrawerId: string | null
}

export default function ChatBox({
  chatMessages,
  onSendMessage,
  currentUserId,
  isDrawing,
  isGamePlaying,
  currentDrawerId,
}: ChatBoxProps) {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!inputValue.trim()) return

    // If player is drawing, they can't guess
    if (isDrawing && isGamePlaying) {
      // Just show a message locally - no need to send to server
      setInputValue("")
      return
    }

    // Determine if this is a guess or chat
    // In a real game, all messages during active gameplay from non-drawers are guesses
    const isGuess = isGamePlaying && currentUserId !== currentDrawerId

    // Send message to server via the callback
    onSendMessage(inputValue, isGuess)
    setInputValue("")
  }

  // Helper to format message timestamp
  const formatTime = (timestamp?: string) => {
    const date = timestamp ? new Date(timestamp) : new Date()
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Helper to determine message styling
  const getMessageStyle = (message: ChatMessage) => {
    if (message.type === "system") return "bg-blue-100 text-blue-800"
    if (message.type === "guess" && message.isCorrect) return "bg-green-100 text-green-800"
    return "bg-gray-100"
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-2">Chat</h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2 pr-1">
        <AnimatePresence initial={false}>
          {chatMessages.map((message, index) => (
            <motion.div
              key={index}
              className={`p-2 rounded-lg ${getMessageStyle(message)}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium">
                  {message.userId === currentUserId ? "You" : message.username}
                </span>
                <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
              </div>
              <p>{message.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder={
            isDrawing && isGamePlaying
              ? "You can't chat while drawing"
              : isGamePlaying
              ? "Type your guess..."
              : "Type a message..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isDrawing && isGamePlaying}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={isDrawing && isGamePlaying}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

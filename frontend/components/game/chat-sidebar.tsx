"use client"

import { motion } from "framer-motion"
import ChatBox from "./chat-box"

interface ChatSidebarProps {
  chatMessages: any[]
  onSendMessage: (message: string, isGuess: boolean) => Promise<void>
  currentUserId: string
  isDrawing: boolean
  isGamePlaying: boolean
  currentDrawerId: string | null
}

export default function ChatSidebar({
  chatMessages,
  onSendMessage,
  currentUserId,
  isDrawing,
  isGamePlaying,
  currentDrawerId,
}: ChatSidebarProps) {
  return (
    <motion.div className="lg:col-span-1 bg-white rounded-lg shadow p-2 sm:p-4 flex flex-col h-full max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] border border-blue-100">
      <ChatBox
        chatMessages={chatMessages}
        onSendMessage={onSendMessage}
        currentUserId={currentUserId}
        isDrawing={isDrawing}
        isGamePlaying={isGamePlaying}
        currentDrawerId={currentDrawerId}
      />
    </motion.div>
  )
}

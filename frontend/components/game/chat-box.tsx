// src/components/game/chat-box.tsx (or your component path)
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

import type { FeedMessage, ChatFeedMessageClient, GuessFeedMessageClient } from "@/types/index"; // Adjust path as needed

interface ChatBoxProps {
  chatMessages: FeedMessage[]; // Use the FeedMessage array type
  onSendMessage: (message: string, isGuess: boolean) => void; // Assuming Promise<void> is handled by caller
  currentUserId: string;
  isDrawing: boolean; // Is the current user the one drawing?
  isGamePlaying: boolean; // Is the game in a state where guessing is active?
  currentDrawerId: string | null; // Who is currently drawing?
}

export default function ChatBox({
  chatMessages,
  onSendMessage,
  currentUserId,
  isDrawing,
  isGamePlaying,
  currentDrawerId,
}: ChatBoxProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Drawer cannot send guesses or chats via this input during their turn.
    if (isDrawing && isGamePlaying) {
      // Optionally provide feedback to user, though input is disabled.
      // console.log("Drawer cannot chat or guess during drawing phase.");
      setInputValue(""); // Clear input just in case
      return;
    }

    // Determine if the message is a guess or a regular chat message.
    // A message is a guess if the game is actively playing AND the sender is NOT the current drawer.
    const isGuess = isGamePlaying && currentUserId !== currentDrawerId;

    onSendMessage(inputValue, isGuess);
    setInputValue("");
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      console.error("Failed to parse timestamp:", timestamp, error);
      return "Invalid time";
    }
  };

  const getMessageStyle = (message: FeedMessage) => {
    if (message.type === "system") return "bg-blue-100 text-blue-800 text-sm italic";
    if (message.type === "guess") {
      // Accessing isCorrect from GuessFeedMessageClient
      return (message as GuessFeedMessageClient).isCorrect ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
    }
    // Default for 'chat' type
    return message.userId === currentUserId ? "bg-indigo-100 text-indigo-900 ml-auto" : "bg-gray-100 text-gray-900";
  };

  const getUsernameDisplay = (message: FeedMessage) => {
    if (message.type === "system") return "System";
    return message.userId === currentUserId ? "You" : message.username;
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-3 text-gray-700 border-b pb-2">Chat & Guesses</h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-2.5 pr-1.5 custom-scrollbar">
        <AnimatePresence initial={false}>
          {chatMessages.map((message) => (
            <motion.div
              key={message.id} // Use the unique ID from FeedMessage
              className={`p-2.5 rounded-lg shadow-sm w-fit max-w-[90%] ${getMessageStyle(message)}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.25, ease: "circOut" }}
              layout // For smoother animations when items are added/removed
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-medium text-sm">
                  {getUsernameDisplay(message)}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message}
                {message.type === 'guess' && (message as GuessFeedMessageClient).isCorrect && (
                  <span className="ml-1 font-semibold">(+{(message as GuessFeedMessageClient).pointsAwarded})</span>
                )}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex items-center space-x-2 pt-2 border-t">
        <Input
          type="text"
          placeholder={
            isDrawing && isGamePlaying
              ? "You are drawing..."
              : isGamePlaying && currentUserId !== currentDrawerId
              ? "Type your guess..."
              : "Type a message..."
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isDrawing && isGamePlaying} // Drawer cannot type when game is playing
          className="flex-1"
          aria-label="Chat input"
        />
        <Button
            type="submit"
            size="icon"
            disabled={(isDrawing && isGamePlaying) || !inputValue.trim()}
            aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
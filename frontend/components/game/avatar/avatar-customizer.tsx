// components/game/avatar/avatar-customizer.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"; // Assuming ShadCN UI
import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PixelAvatar from "./pixel-avatar"; 
import type { AvatarFeatures } from "@/context/UserContext"; // Import from UserContext

// Avatar customization options
const COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4", "#FFFFFF", "#7F7F7F", "#000000"];
const FACES = ["happy", "cool", "surprised", "angry", "sad", "sleepy", "neutral"];
const HATS = ["none", "crown", "beanie", "cap", "party", "wizard", "flower"];
const ACCESSORIES = ["none", "glasses", "eyepatch", "monocle", "mask", "scarf"];

interface AvatarCustomizerProps {
  initialAvatar?: AvatarFeatures; // Optional initial state
  onAvatarChange: (features: AvatarFeatures) => void;
}

export default function AvatarCustomizer({ initialAvatar, onAvatarChange }: AvatarCustomizerProps) {
  const [colorIndex, setColorIndex] = useState(() => initialAvatar ? COLORS.indexOf(initialAvatar.color) : 0);
  const [faceIndex, setFaceIndex] = useState(() => initialAvatar ? FACES.indexOf(initialAvatar.face) : 0);
  const [hatIndex, setHatIndex] = useState(() => initialAvatar ? HATS.indexOf(initialAvatar.hat) : 0);
  const [accessoryIndex, setAccessoryIndex] = useState(() => initialAvatar ? ACCESSORIES.indexOf(initialAvatar.accessory) : 0);

  const currentFeatures: AvatarFeatures = {
    color: COLORS[colorIndex < 0 ? 0 : colorIndex], // Ensure index is valid
    face: FACES[faceIndex < 0 ? 0 : faceIndex],
    hat: HATS[hatIndex < 0 ? 0 : hatIndex],
    accessory: ACCESSORIES[accessoryIndex < 0 ? 0 : accessoryIndex],
  };

  // Effect to call onAvatarChange when features change
  useEffect(() => {
    onAvatarChange(currentFeatures);
  }, [colorIndex, faceIndex, hatIndex, accessoryIndex, onAvatarChange]); // currentFeatures isn't stable for dep array

  // Initialize with initialAvatar if provided and valid
   useEffect(() => {
    if (initialAvatar) {
        const initialColorIdx = COLORS.indexOf(initialAvatar.color);
        const initialFaceIdx = FACES.indexOf(initialAvatar.face);
        const initialHatIdx = HATS.indexOf(initialAvatar.hat);
        const initialAccessoryIdx = ACCESSORIES.indexOf(initialAvatar.accessory);

        if (initialColorIdx !== -1) setColorIndex(initialColorIdx);
        if (initialFaceIdx !== -1) setFaceIndex(initialFaceIdx);
        if (initialHatIdx !== -1) setHatIndex(initialHatIdx);
        if (initialAccessoryIdx !== -1) setAccessoryIndex(initialAccessoryIdx);
    }
  }, [initialAvatar]);


  const nextItem = (setter: React.Dispatch<React.SetStateAction<number>>, length: number) => setter(prev => (prev + 1) % length);
  const prevItem = (setter: React.Dispatch<React.SetStateAction<number>>, length: number) => setter(prev => (prev - 1 + length) % length);

  const randomize = () => {
    setColorIndex(Math.floor(Math.random() * COLORS.length));
    setFaceIndex(Math.floor(Math.random() * FACES.length));
    setHatIndex(Math.floor(Math.random() * HATS.length));
    setAccessoryIndex(Math.floor(Math.random() * ACCESSORIES.length));
  };


  return (
    <div className="w-full bg-gradient-to-br from-blue-800/80 to-indigo-800/80 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between border border-blue-700 shadow-lg gap-4 max-h-fit sm:max-h-72">
      {/* Avatar Display */}
      <div className="bg-blue-900/30 p-2 sm:p-4 rounded-lg border border-blue-700/50 shadow-inner flex items-center justify-center h-32 w-32 sm:h-full sm:w-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentFeatures.color}-${currentFeatures.face}-${currentFeatures.hat}-${currentFeatures.accessory}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Ensure PixelAvatar can handle the features and size */}
            <PixelAvatar features={currentFeatures} size="lg" showAnimation={true} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex flex-col h-full justify-between flex-1 w-full sm:w-auto">
        <h2 className="text-white text-md sm:text-lg font-bold mb-2 text-center sm:text-left">Customize Your Avatar</h2>
        
        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Color Control */}
          <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-700">
            <div className="text-white text-xs font-medium mb-1 text-center">Color</div>
            <div className="flex justify-center space-x-1">
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => prevItem(setColorIndex, COLORS.length)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 rounded-full border border-white/50" style={{ backgroundColor: currentFeatures.color }}></div>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => nextItem(setColorIndex, COLORS.length)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Face Control */}
          <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-700">
            <div className="text-white text-xs font-medium mb-1 text-center">Face</div>
            <div className="flex justify-center space-x-1">
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => prevItem(setFaceIndex, FACES.length)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center bg-gray-200 rounded-full text-sm">
                {getFaceEmoji(currentFeatures.face)}
              </div>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => nextItem(setFaceIndex, FACES.length)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Hat Control */}
           <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-700">
            <div className="text-white text-xs font-medium mb-1 text-center">Hat</div>
            <div className="flex justify-center space-x-1">
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => prevItem(setHatIndex, HATS.length)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center bg-gray-200 rounded-full text-sm">
                {getHatEmoji(currentFeatures.hat)}
              </div>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => nextItem(setHatIndex, HATS.length)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Accessory Control */}
          <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-700">
            <div className="text-white text-xs font-medium mb-1 text-center">Accessory</div>
            <div className="flex justify-center space-x-1">
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => prevItem(setAccessoryIndex, ACCESSORIES.length)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <div className="h-6 w-6 flex items-center justify-center bg-gray-200 rounded-full text-sm">
                {getAccessoryEmoji(currentFeatures.accessory)}
              </div>
              <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full shadow-md p-0" onClick={() => nextItem(setAccessoryIndex, ACCESSORIES.length)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <motion.div className="mt-2 self-center" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="secondary" className="flex items-center gap-1 px-3 py-1 shadow-md text-xs sm:text-sm" onClick={randomize}>
            <Shuffle className="h-3 w-3" />
            Randomize
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// Helper functions (keep these or move to a utils file if preferred)
function getFaceEmoji(face: string): string {
  const map: Record<string, string> = { "happy": "😊", "cool": "😎", "surprised": "😮", "angry": "😠", "sad": "😢", "sleepy": "😴", "neutral": "😐" };
  return map[face] || "🙂";
}
function getHatEmoji(hat: string): string {
  const map: Record<string, string> = { "none": "❌", "crown": "👑", "beanie": "🧢", "cap": "⛑️", "party": "🎉", "wizard": "🧙", "flower": "🌸" };
  return map[hat] || "❓";
}
function getAccessoryEmoji(accessory: string): string {
  const map: Record<string, string> = { "none": "❌", "glasses": "👓", "eyepatch": "🏴‍☠️", "monocle": "🧐", "mask": "😷", "scarf": "🧣" };
  return map[accessory] || "❓";
}
"use client"
import type { AvatarFeatures } from "@/types/avatar"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface PixelAvatarProps {
  features: AvatarFeatures
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  isDrawing?: boolean
  showAnimation?: boolean
  animationType?: "bounce" | "pulse" | "wave" | "shake" | "none"
  className?: string
  onClick?: () => void
}

export default function PixelAvatar({
  features,
  size = "md",
  isDrawing = false,
  showAnimation = false,
  animationType = "bounce",
  className = "",
  onClick,
}: PixelAvatarProps) {
  const { color, face, hat, accessory } = features
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  // Reset click state after animation
  useEffect(() => {
    if (isClicked) {
      const timer = setTimeout(() => setIsClicked(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isClicked])

  // Size classes
  const sizeClasses = {
    xs: "w-8 h-8",
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-32 h-32",
    xl: "w-40 h-40",
    "2xl": "w-64 h-64",
  }

  // Animation variants based on type
  const getAnimationVariants = () => {
    switch (animationType) {
      case "bounce":
        return { y: [0, -5, 0] }
      case "pulse":
        return { scale: [1, 1.05, 1] }
      case "wave":
        return { rotate: [0, 5, 0, -5, 0] }
      case "shake":
        return { x: [0, -3, 3, -3, 0] }
      default:
        return {}
    }
  }

  // Click animation
  const clickAnimation = {
    scale: [1, 0.95, 1],
    transition: { duration: 0.3 }
  }

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} overflow-visible cursor-pointer ${className}`}
      animate={
        isClicked 
          ? clickAnimation 
          : showAnimation 
            ? getAnimationVariants() 
            : {}
      }
      transition={
        showAnimation
          ? {
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              repeatType: "mirror",
            }
          : {}
      }
      whileHover={{ scale: isHovered ? 1.05 : 1 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => {
        setIsClicked(true)
        if (onClick) onClick()
      }}
    >
      {/* Character container */}
      <div className="w-full h-full relative">
        {/* Shadow */}
        <div className="absolute bottom-0 w-full flex justify-center">
          <div className="w-4/5 h-2 bg-black/10 rounded-full blur-sm"></div>
        </div>

        {/* Character with shoulders and neck */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          
          {/* Neck */}
          <path 
            d="M 40 75 L 40 65 L 60 65 L 60 75 Z" 
            fill={color} 
            opacity="0.95"
            filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.1))"
          />
          
          {/* Shoulders */}
          <path 
            d="M 20 75 Q 50 65 80 75 L 80 85 Q 50 75 20 85 Z" 
            fill={color} 
            opacity="0.9"
            filter="drop-shadow(0px 2px 1px rgba(0,0,0,0.2))"
          />

          {/* Head */}
          <circle 
            cx="50" 
            cy="40" 
            r="30" 
            fill={color}
            filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.15))"
          />
          
          {/* Highlight on head */}
          <circle 
            cx="40" 
            cy="30" 
            r="10" 
            fill="white" 
            opacity="0.2" 
          />
        </svg>

        {/* Face */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ top: "-15%" }}>
          {renderFace(face, isHovered)}
        </div>

        {/* Hat */}
        {hat !== "none" && (
          <div className="absolute top-0 left-0 w-full">
            {renderHat(hat, color)}
          </div>
        )}

        {/* Accessory */}
        {accessory !== "none" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ top: "-15%" }}>
            {renderAccessory(accessory, color)}
          </div>
        )}
      </div>

      {/* Drawing indicator */}
      {isDrawing && (
        <motion.div
          className="absolute -top-1 -right-1 bg-yellow-400 text-xs font-bold text-black px-1.5 py-0.5 rounded-full shadow-md"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring" }}
        >
          ✏️
        </motion.div>
      )}
      
      {/* Hover effect */}
      {isHovered && (
        <motion.div 
          className="absolute inset-0 rounded-full bg-white opacity-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
        />
      )}
    </motion.div>
  )
}

function renderFace(face: string, isHovered: boolean) {
  switch (face) {
    case "happy":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Eyes */}
          <circle cx="30" cy="40" r="8" fill="black" />
          <circle cx="70" cy="40" r="8" fill="black" />
          {/* White glint in eyes */}
          <circle cx="33" cy="37" r="3" fill="white" opacity="0.6" />
          <circle cx="73" cy="37" r="3" fill="white" opacity="0.6" />
          {/* Smile */}
          <path 
            d="M 30 65 Q 50 85 70 65" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          {/* Blush on hover */}
          {isHovered && (
            <>
              <circle cx="25" cy="60" r="8" fill="#f87171" opacity="0.4" />
              <circle cx="75" cy="60" r="8" fill="#f87171" opacity="0.4" />
            </>
          )}
        </svg>
      )
    case "cool":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Sunglasses */}
          <rect x="15" y="35" width="30" height="15" rx="5" fill="black" />
          <rect x="55" y="35" width="30" height="15" rx="5" fill="black" />
          <rect x="45" y="35" width="10" height="5" fill="black" />
          
          {/* Reflection on glasses */}
          <path d="M 20 38 L 35 42" stroke="white" strokeWidth="2" opacity="0.5" />
          <path d="M 60 38 L 75 42" stroke="white" strokeWidth="2" opacity="0.5" />
          
          {/* Smile */}
          <path 
            d={isHovered ? "M 35 70 L 45 65 L 55 65 L 65 70" : "M 35 70 L 65 70"} 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
        </svg>
      )
    case "surprised":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Eyes */}
          <circle cx="30" cy="40" r="10" fill="black" />
          <circle cx="70" cy="40" r="10" fill="black" />
          
          {/* White glint in eyes */}
          <circle cx="33" cy="37" r="3" fill="white" opacity="0.6" />
          <circle cx="73" cy="37" r="3" fill="white" opacity="0.6" />
          
          {/* Mouth */}
          <circle 
            cx="50" 
            cy="70" 
            r={isHovered ? "13" : "10"} 
            fill="black" 
          />
          <circle 
            cx="50" 
            cy="70" 
            r={isHovered ? "8" : "5"} 
            fill="#ef4444" 
          />
          
          {/* Eyebrows on hover */}
          {isHovered && (
            <>
              <path d="M 20 25 L 40 30" stroke="black" strokeWidth="4" strokeLinecap="round" fill="transparent" />
              <path d="M 80 25 L 60 30" stroke="black" strokeWidth="4" strokeLinecap="round" fill="transparent" />
            </>
          )}
        </svg>
      )
    case "angry":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Eyebrows */}
          <path 
            d="M 20 30 L 40 40" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          <path 
            d="M 80 30 L 60 40" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          
          {/* Eyes */}
          <circle cx="30" cy="45" r="8" fill="black" />
          <circle cx="70" cy="45" r="8" fill="black" />
          
          {/* White glint in eyes */}
          <circle cx="33" cy="42" r="3" fill="white" opacity="0.6" />
          <circle cx="73" cy="42" r="3" fill="white" opacity="0.6" />
          
          {/* Frown */}
          <path 
            d="M 30 75 Q 50 60 70 75" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          
          {/* Steam/anger marks on hover */}
          {isHovered && (
            <>
              <path d="M 15 20 L 20 25 L 15 30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="transparent" />
              <path d="M 85 20 L 80 25 L 85 30" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" fill="transparent" />
            </>
          )}
        </svg>
      )
    case "sad":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Eyebrows */}
          {isHovered && (
            <>
              <path d="M 25 35 L 35 30" stroke="black" strokeWidth="3" strokeLinecap="round" fill="transparent" />
              <path d="M 75 35 L 65 30" stroke="black" strokeWidth="3" strokeLinecap="round" fill="transparent" />
            </>
          )}
          
          {/* Eyes with tears */}
          <circle cx="30" cy="40" r="8" fill="black" />
          <circle cx="70" cy="40" r="8" fill="black" />
          
          {/* Tears */}
          <path 
            d="M 30 48 Q 25 55 25 65" 
            stroke="#60a5fa" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          <path 
            d="M 70 48 Q 75 55 75 65" 
            stroke="#60a5fa" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          <circle cx="25" cy="65" r="4" fill="#60a5fa" />
          <circle cx="75" cy="65" r="4" fill="#60a5fa" />
          
          {/* Frown */}
          <path 
            d="M 30 75 Q 50 60 70 75" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
        </svg>
      )
    case "sleepy":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Closed eyes */}
          <path 
            d="M 20 40 L 40 40" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          <path 
            d="M 60 40 L 80 40" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          
          {/* Mouth */}
          <path 
            d={isHovered ? "M 40 70 Q 50 65 60 70" : "M 40 70 L 60 70"} 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
          
          {/* Z's */}
          <text x="75" y="25" fontSize="20" fontWeight="bold" fill="black">
            z
          </text>
          <text x="85" y="15" fontSize="15" fontWeight="bold" fill="black">
            z
          </text>
          <text x="92" y="8" fontSize="10" fontWeight="bold" fill="black">
            z
          </text>
        </svg>
      )
    case "wink":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* One eye open, one closed */}
          <circle cx="30" cy="40" r="8" fill="black" />
          <circle cx="33" cy="37" r="3" fill="white" opacity="0.6" />
          <path 
            d="M 60 40 L 80 40" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round" 
            fill="transparent" 
          />
          
          {/* Smile */}
          <path 
            d="M 30 65 Q 50 80 70 65" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round"
            fill="transparent" 
          />
        </svg>
      )
    case "cute":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Eyes */}
          <circle cx="30" cy="40" r="6" fill="black" />
          <circle cx="70" cy="40" r="6" fill="black" />
          
          {/* White glint in eyes */}
          <circle cx="32" cy="38" r="2" fill="white" opacity="0.8" />
          <circle cx="72" cy="38" r="2" fill="white" opacity="0.8" />
          
          {/* Rosy cheeks */}
          <circle cx="25" cy="55" r="8" fill="#f87171" opacity="0.5" />
          <circle cx="75" cy="55" r="8" fill="#f87171" opacity="0.5" />
          
          {/* Smile */}
          <path 
            d="M 40 60 Q 50 70 60 60" 
            stroke="black" 
            strokeWidth="4" 
            strokeLinecap="round"
            fill="transparent" 
          />
          
          {/* Blush more on hover */}
          {isHovered && (
            <>
              <circle cx="25" cy="55" r="10" fill="#f87171" opacity="0.6" />
              <circle cx="75" cy="55" r="10" fill="#f87171" opacity="0.6" />
            </>
          )}
        </svg>
      )
    case "robot":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Square eyes */}
          <rect x="20" y="35" width="20" height="10" rx="2" fill="#10b981" />
          <rect x="60" y="35" width="20" height="10" rx="2" fill="#10b981" />
          
          {/* Screen mouth */}
          <rect 
            x="35" 
            y="60" 
            width="30" 
            height="15" 
            rx="3" 
            fill="black" 
            stroke="#111" 
            strokeWidth="2" 
          />
          
          {/* Audio visualizer in mouth */}
          <path 
            d={isHovered 
              ? "M 40 67 L 45 63 L 50 68 L 55 62 L 60 67" 
              : "M 40 67 L 45 65 L 50 67 L 55 65 L 60 67"} 
            stroke="#10b981" 
            strokeWidth="2" 
            fill="transparent" 
          />
          
          {/* Circuit details */}
          <path d="M 15 50 L 25 50" stroke="#6b7280" strokeWidth="1" />
          <path d="M 75 50 L 85 50" stroke="#6b7280" strokeWidth="1" />
          <circle cx="15" cy="50" r="2" fill="#10b981" />
          <circle cx="85" cy="50" r="2" fill="#10b981" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          {/* Default face */}
          <circle cx="30" cy="40" r="8" fill="black" />
          <circle cx="70" cy="40" r="8" fill="black" />
          <path 
            d="M 30 70 L 70 70" 
            stroke="black" 
            strokeWidth="5" 
            strokeLinecap="round" 
            fill="transparent" 
          />
        </svg>
      )
  }
}

function renderHat(hat: string, skinColor: string) {
  const complementaryColor = getComplementaryColor(skinColor)
  
  switch (hat) {
    case "crown":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-crown" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          <path
            d="M 10 30 L 25 10 L 40 30 L 55 10 L 70 30 L 85 10 L 90 30 L 10 30"
            fill="#fcd34d"
            stroke="#fbbf24"
            strokeWidth="2"
            filter="url(#shadow-crown)"
          />
          {/* Jewels */}
          <circle cx="25" cy="17" r="3" fill="#ef4444" />
          <circle cx="55" cy="17" r="3" fill="#3b82f6" />
          <circle cx="85" cy="17" r="3" fill="#10b981" />
        </svg>
      )
    case "beanie":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-beanie" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          <path 
            d="M 10 30 Q 50 0 90 30 L 90 40 Q 50 20 10 40 Z" 
            fill={complementaryColor || "#ef4444"} 
            stroke="#dc2626" 
            strokeWidth="2"
            filter="url(#shadow-beanie)"
          />
          {/* Pom pom */}
          <circle cx="50" cy="5" r="8" fill="white" />
          <circle cx="50" cy="5" r="6" fill="#f3f4f6" />
          
          {/* Texture lines */}
          <path d="M 20 35 Q 50 15 80 35" stroke="#dc2626" strokeWidth="1" fill="transparent" opacity="0.5" />
          <path d="M 25 39 Q 50 22 75 39" stroke="#dc2626" strokeWidth="1" fill="transparent" opacity="0.5" />
        </svg>
      )
    case "cap":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-cap" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          <path 
            d="M 5 35 Q 50 10 95 35 L 95 40 Q 50 20 5 40 Z" 
            fill={complementaryColor || "#22c55e"} 
            stroke="#16a34a" 
            strokeWidth="2"
            filter="url(#shadow-cap)"
          />
          <path 
            d="M 40 35 Q 50 30 60 35 L 60 25 Q 50 20 40 25 Z" 
            fill={complementaryColor || "#22c55e"} 
            stroke="#16a34a" 
            strokeWidth="2"
            filter="url(#shadow-cap)"
          />
          
          {/* Logo */}
          <circle cx="50" cy="30" r="8" fill="white" opacity="0.8" />
          <text x="47" y="34" fontSize="12" fontWeight="bold" fill="#16a34a">P</text>
        </svg>
      )
    case "party":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-party" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          <path 
            d="M 40 10 L 50 40 L 60 10 Z" 
            fill="#a855f7" 
            stroke="#9333ea" 
            strokeWidth="2"
            filter="url(#shadow-party)"
          />
          <circle cx="50" cy="10" r="5" fill="#fcd34d" />
          
          {/* Party streamers */}
          <path d="M 30 20 Q 25 15 20 20" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeDasharray="2" />
          <path d="M 70 20 Q 75 15 80 20" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeDasharray="2" />
          <path d="M 40 15 Q 35 5 30 10" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeDasharray="2" />
          <path d="M 60 15 Q 65 5 70 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeDasharray="2" />
        </svg>
      )
    case "wizard":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-wizard" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          <path 
            d="M 30 30 L 50 0 L 70 30 Z" 
            fill="#1e40af" 
            stroke="#1e3a8a" 
            strokeWidth="2"
            filter="url(#shadow-wizard)"
          />
          <path 
            d="M 20 30 Q 50 20 80 30 L 80 40 Q 50 30 20 40 Z" 
            fill="#1e40af" 
            stroke="#1e3a8a" 
            strokeWidth="2"
            filter="url(#shadow-wizard)"
          />
          
          {/* Stars */}
          <circle cx="50" cy="15" r="3" fill="#fcd34d" />
          <path d="M 35 25 L 38 22 L 35 19 L 38 16" stroke="#fcd34d" strokeWidth="1" />
          <path d="M 65 25 L 62 22 L 65 19 L 62 16" stroke="#fcd34d" strokeWidth="1" />
          
          {/* Moon */}
          <path d="M 50 5 Q 53 2 56 5 Q 59 8 56 11 Q 53 14 50 11 Q 47 8 50 5" fill="#f3f4f6" />
        </svg>
      )
    case "chef":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-chef" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          {/* Chef hat */}
          <path 
            d="M 25 30 Q 25 15 50 10 Q 75 15 75 30 Q 90 30 90 40 L 10 40 Q 10 30 25 30" 
            fill="white" 
            stroke="#d1d5db" 
            strokeWidth="2"
            filter="url(#shadow-chef)"
          />
          
          {/* Texture lines */}
          <path d="M 30 35 Q 50 25 70 35" stroke="#d1d5db" strokeWidth="1" fill="transparent" />
          <path d="M 35 27 Q 50 20 65 27" stroke="#d1d5db" strokeWidth="1" fill="transparent" />
        </svg>
      )
    case "cowboy":
      return (
        <svg viewBox="0 0 100 100" className="w-full">
          <filter id="shadow-cowboy" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
          </filter>
          {/* Cowboy hat */}
          <path 
            d="M 10 35 L 10 25 Q 50 10 90 25 L 90 35" 
            fill="#92400e" 
            stroke="#78350f" 
            strokeWidth="2"
            filter="url(#shadow-cowboy)"
          />
          <path 
            d="M 5 35 Q 50 25 95 35 L 95 40 Q 50 30 5 40 Z" 
            fill="#92400e" 
            stroke="#78350f" 
            strokeWidth="2"
            filter="url(#shadow-cowboy)"
          />
          
          {/* Hat band */}
          <path d="M 10 35 Q 50 25 90 35" stroke="#78350f" strokeWidth="3" fill="transparent" />
          <rect x="47" y="32" width="6" height="4" fill="#fbbf24" />
        </svg>
      )
    default:
      return null
  }
}

function renderAccessory(accessory: string, skinColor: string) {
  const complementaryColor = getComplementaryColor(skinColor)
  
  switch (accessory) {
    case "glasses":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <circle cx="30" cy="40" r="15" fill="transparent" stroke="black" strokeWidth="3" />
          <circle cx="70" cy="40" r="15" fill="transparent" stroke="black" strokeWidth="3" />
          <path d="M 45 40 L 55 40" stroke="black" strokeWidth="3" />
          
          {/* Shine on glasses */}
          <path d="M 20 35 L 25 38" stroke="white" strokeWidth="2" opacity="0.7" />
          <path d="M 60 35 L 65 38" stroke="white" strokeWidth="2" opacity="0.7" />
        </svg>
      )
    case "eyepatch":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <rect x="15" y="30" width="30" height="20" rx="5" fill="black" />
          <path d="M 15 40 L 5 50" stroke="black" strokeWidth="3" />
          <path d="M 45 40 L 55 30" stroke="black" strokeWidth="3" />
          
          {/* Texture detail */}
          <path d="M 20 35 L 40 35" stroke="#27272a" strokeWidth="1" opacity="0.5" />
          <path d="M 20 40 L 40 40" stroke="#27272a" strokeWidth="1" opacity="0.5" />
          <path d="M 20 45 L 40 45" stroke="#27272a" strokeWidth="1" opacity="0.5" />
        </svg>
      )
    case "monocle":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <circle cx="70" cy="40" r="15" fill="transparent" stroke="black" strokeWidth="3" />
          <path d="M 70 55 L 65 70" stroke="black" strokeWidth="2" />
          <circle cx="65" cy="70" r="3" fill="#fcd34d" />
          
          {/* Shine on monocle */}
          <path d="M 60 35 L 65 38" stroke="white" strokeWidth="2" opacity="0.7" />
        </svg>
      )
    case "mask":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 20 40 Q 50 60 80 40 L 80 50 Q 50 70 20 50 Z" 
            fill="#e5e7eb" 
            stroke="#d1d5db" 
            strokeWidth="2" 
          />
          <path d="M 50 50 L 50 60" stroke="#d1d5db" strokeWidth="2" />
          
          {/* Texture lines */}
          <path d="M 30 45 Q 50 55 70 45" stroke="#d1d5db" strokeWidth="1" fill="transparent" opacity="0.5" />
          <path d="M 35 50 Q 50 60 65 50" stroke="#d1d5db" strokeWidth="1" fill="transparent" opacity="0.5" />
        </svg>
      )
    case "mustache":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 30 65 Q 40 55 50 65 Q 60 55 70 65" 
            stroke="black" 
            strokeWidth="5" 
            fill="black" 
          />
        </svg>
      )
    case "beard":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 30 50 L 30 80 Q 50 85 70 80 L 70 50" 
            fill="#422006" 
            stroke="#27170d" 
            strokeWidth="1" 
          />
          
          {/* Texture */}
          <path d="M 40 60 L 40 75" stroke="#27170d" strokeWidth="1" fill="transparent" opacity="0.7" />
          <path d="M 50 60 L 50 80" stroke="#27170d" strokeWidth="1" fill="transparent" opacity="0.7" />
          <path d="M 60 60 L 60 75" stroke="#27170d" strokeWidth="1" fill="transparent" opacity="0.7" />
        </svg>
      )
    case "necktie":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 45 65 L 40 100 L 50 90 L 60 100 L 55 65" 
            fill={complementaryColor || "#ef4444"} 
            stroke="#dc2626" 
            strokeWidth="2" 
          />
          
          {/* Knot */}
          <path 
            d="M 45 65 L 50 70 L 55 65" 
            fill={complementaryColor || "#ef4444"} 
            stroke="#dc2626" 
            strokeWidth="2" 
          />
          
          {/* Pattern */}
          <path d="M 45 80 L 55 80" stroke="#dc2626" strokeWidth="1" opacity="0.7" />
          <path d="M 43 90 L 57 90" stroke="#dc2626" strokeWidth="1" opacity="0.7" />
        </svg>
      )
    case "bowtie":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 30 65 L 25 55 L 30 45 L 45 55 L 30 65" 
            fill={complementaryColor || "#3b82f6"} 
            stroke="#2563eb" 
            strokeWidth="1" 
          />
          <path 
            d="M 70 65 L 75 55 L 70 45 L 55 55 L 70 65" 
            fill={complementaryColor || "#3b82f6"} 
            stroke="#2563eb" 
            strokeWidth="1" 
          />
          <rect x="45" y="52" width="10" height="6" rx="2" fill={complementaryColor || "#3b82f6"} stroke="#2563eb" strokeWidth="1" />
        </svg>
      )
    case "scarf":
      return (
        <svg viewBox="0 0 100 100" className="w-3/4 h-3/4">
          <path 
            d="M 30 60 Q 50 70 70 60 L 75 80 Q 55 85 70 90 L 65 95 Q 50 90 35 95 L 30 90 Q 45 85 25 80 Z" 
            fill={complementaryColor || "#8b5cf6"} 
            stroke="#7c3aed" 
            strokeWidth="1" 
          />
          
          {/* Texture lines */}
          <path d="M 32 70 L 68 70" stroke="#7c3aed" strokeWidth="1" opacity="0.5" />
          <path d="M 30 80 L 70 80" stroke="#7c3aed" strokeWidth="1" opacity="0.5" />
          <path d="M 35 90 L 65 90" stroke="#7c3aed" strokeWidth="1" opacity="0.5" />
        </svg>
      )
    default:
      return null
  }
}

// Helper function to generate complementary color
function getComplementaryColor(hexColor: string): string {
  // Default if invalid color is provided
  if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
    return '#3b82f6'; // Default blue
  }
  
  // Parse the hex color
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Get complementary color
  const rComp = 255 - r;
  const gComp = 255 - g;
  const bComp = 255 - b;
  
  // Adjust for better visual appeal
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  
  // If color is very light or dark, choose a predefined color
  if (luminance < 40) {
    return '#f59e0b'; // Amber for dark colors
  } else if (luminance > 210) {
    return '#7c3aed'; // Purple for light colors
  }
  
  // Return complementary color
  return `#${rComp.toString(16).padStart(2, '0')}${gComp.toString(16).padStart(2, '0')}${bComp.toString(16).padStart(2, '0')}`;
}
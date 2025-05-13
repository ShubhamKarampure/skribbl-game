"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function AnimatedLogo() {
  const [isHovered, setIsHovered] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // Auto-animate periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHovered) {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 2000)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isHovered])

  const letterVariants = {
    initial: { y: 0 },
    animate: (i: number) => ({
      y: [0, -10, 0],
      transition: {
        delay: i * 0.05,
        duration: 0.5,
        repeat: isAnimating ? 1 : 0,
        repeatType: "reverse" as const,
      },
    }),
  }

  const outlineVariants = {
    initial: {
      pathLength: 0,
      opacity: 0,
    },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse" as const,
        repeatDelay: 1,
      },
    },
  }

  const pencilVariants = {
    initial: { rotate: 0 },
    animate: {
      rotate: [0, -10, 0, 10, 0],
      transition: {
        duration: 1.5,
        repeat: isAnimating ? 1 : 0,
        repeatType: "reverse" as const,
      },
    },
  }

  return (
    <div
      className="relative w-full flex justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsAnimating(true)}
    >
      {/* Animated outline */}
      <div className="absolute w-full h-full flex justify-center items-center pointer-events-none">
        <svg
          width="280"
          height="100"
          viewBox="0 0 280 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute"
        >
          <motion.path
            d="M10,50 Q10,10 50,10 L230,10 Q270,10 270,50 Q270,90 230,90 L50,90 Q10,90 10,50"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            variants={outlineVariants}
            initial="initial"
            animate="animate"
          />
        </svg>
      </div>

      {/* Logo text */}
      <h1 className="text-6xl font-bold text-center relative">
        {["s", "k", "e", "t", "c", "h", ".", "i", "o"].map((letter, i) => (
          <motion.span
            key={i}
            className={getLetterColor(i)}
            variants={letterVariants}
            initial="initial"
            animate={isHovered || isAnimating ? "animate" : "initial"}
            custom={i}
          >
            {letter}
          </motion.span>
        ))}
        <motion.div
          className="inline-block ml-1"
          variants={pencilVariants}
          initial="initial"
          animate={isHovered || isAnimating ? "animate" : "initial"}
        >
          <Image
            src="/placeholder.svg?height=40&width=20"
            width={20}
            height={40}
            alt="Pencil"
            className="-rotate-12 transform"
          />
        </motion.div>
      </h1>
    </div>
  )
}

function getLetterColor(index: number): string {
  const colors = [
    "text-red-500",
    "text-orange-500",
    "text-green-500",
    "text-blue-400",
    "text-indigo-400",
    "text-purple-500",
    "text-pink-400",
    "text-yellow-500",
    "text-emerald-400",
  ]

  return colors[index % colors.length]
}

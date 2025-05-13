"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"

export default function BackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    handleResize()

    // Create grid pattern
    const gridSize = 30
    const dotSize = 2

    // Animation variables
    let time = 0
    const waveSpeed = 0.002
    const waveHeight = 5

    function draw() {
      if (!ctx || !canvas) return

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "#1e3a8a") // dark blue
      gradient.addColorStop(1, "#312e81") // indigo-900
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw grid of dots with wave effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"

      for (let x = gridSize; x < canvas.width; x += gridSize) {
        for (let y = gridSize; y < canvas.height; y += gridSize) {
          // Calculate wave offset
          const distanceFromCenter = Math.sqrt(Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2))

          const waveOffset = Math.sin(distanceFromCenter * 0.01 + time) * waveHeight

          ctx.beginPath()
          ctx.arc(x, y + waveOffset, dotSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw some random floating particles
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
      for (let i = 0; i < 20; i++) {
        const x = Math.sin(time * (i + 1) * 0.1) * canvas.width * 0.4 + canvas.width * 0.5
        const y = Math.cos(time * (i + 1) * 0.1) * canvas.height * 0.4 + canvas.height * 0.5
        const size = Math.sin(time * (i + 1) * 0.1) * 2 + 3

        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }

      // Update time
      time += waveSpeed

      requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    />
  )
}

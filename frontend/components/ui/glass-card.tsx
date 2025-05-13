"use client"

import { cn } from "@/lib/utils"
import { motion, type MotionProps } from "framer-motion"
import type { ReactNode } from "react"

interface GlassCardProps extends MotionProps {
  children: ReactNode
  className?: string
  intensity?: "light" | "medium" | "heavy"
}

export default function GlassCard({ children, className, intensity = "medium", ...motionProps }: GlassCardProps) {
  const intensityMap = {
    light: "bg-white/60 backdrop-blur-sm border-white/40",
    medium: "bg-white/70 backdrop-blur-md border-white/50",
    heavy: "bg-white/80 backdrop-blur-lg border-white/60",
  }

  return (
    <motion.div className={cn("rounded-xl border shadow-lg", intensityMap[intensity], className)} {...motionProps}>
      {children}
    </motion.div>
  )
}

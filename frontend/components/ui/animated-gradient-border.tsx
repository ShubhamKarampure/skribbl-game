"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface AnimatedGradientBorderProps {
  children: ReactNode
  className?: string
  containerClassName?: string
  borderWidth?: number
  animationDuration?: number
}

export default function AnimatedGradientBorder({
  children,
  className,
  containerClassName,
  borderWidth = 1,
  animationDuration = 3,
}: AnimatedGradientBorderProps) {
  return (
    <div className={cn("relative rounded-xl", containerClassName)}>
      <div
        className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600",
          "animate-gradient-x z-0"
        )}
        style={{
          animationDuration: `${animationDuration}s`,
        }}
      />
      <div
        className={cn("relative rounded-xl z-10", className)}
        style={{ margin: `${borderWidth}px` }}
      >
        {children}
      </div>
    </div>
  )
}

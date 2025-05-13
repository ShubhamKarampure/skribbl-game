"use client"

import { Button } from "@/components/ui/button"

interface ErrorStateProps {
  error: string | null
  onGoHome: () => void
}

export default function ErrorState({ error, onGoHome }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-red-600">
        Error: {error} <Button onClick={onGoHome}>Go Home</Button>
      </p>
    </div>
  )
}

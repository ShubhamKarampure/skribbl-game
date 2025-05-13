"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Trophy, Medal, Award } from "lucide-react"
import GameBackground from "@/components/game-background"

interface Player {
  id: number
  name: string
  avatar: {
    color: string
    eye: string
    mouth: string
  }
  score: number
  rank: number
}

export default function ResultsPage() {
  const router = useRouter()

  // Mock players with results
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Player 1", avatar: { color: "#22c55e", eye: "normal", mouth: "smile" }, score: 1250, rank: 1 },
    { id: 2, name: "Player 2", avatar: { color: "#3b82f6", eye: "happy", mouth: "open" }, score: 950, rank: 2 },
    { id: 3, name: "Player 3", avatar: { color: "#ec4899", eye: "surprised", mouth: "neutral" }, score: 720, rank: 3 },
    { id: 4, name: "Player 4", avatar: { color: "#eab308", eye: "angry", mouth: "frown" }, score: 580, rank: 4 },
  ])

  const playAgain = () => {
    router.push("/game")
  }

  const backToHome = () => {
    router.push("/")
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative">
      <GameBackground />

      <div className="z-10 w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8">Game Results</h1>

        {/* Winner podium */}
        <div className="flex justify-center items-end mb-12 h-40">
          {players.slice(0, 3).map((player) => (
            <div
              key={player.id}
              className="flex flex-col items-center mx-4"
              style={{
                height: player.rank === 1 ? "100%" : player.rank === 2 ? "80%" : "60%",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: player.avatar.color }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute top-5 w-full flex justify-center space-x-3">
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                    <div className="w-2 h-2 bg-black rounded-full"></div>
                  </div>
                  <div className="absolute top-8 w-full flex justify-center">
                    <div className="w-4 h-1 bg-black rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="font-bold">{player.name}</div>
                <div className="text-gray-600">{player.score} pts</div>
              </div>

              <div className="mt-auto w-full">
                <div
                  className={`h-20 rounded-t-lg flex items-center justify-center ${
                    player.rank === 1 ? "bg-yellow-400" : player.rank === 2 ? "bg-gray-300" : "bg-amber-600"
                  }`}
                >
                  {player.rank === 1 && <Trophy className="h-8 w-8 text-yellow-700" />}
                  {player.rank === 2 && <Medal className="h-6 w-6 text-gray-600" />}
                  {player.rank === 3 && <Award className="h-6 w-6 text-amber-800" />}
                </div>
                <div className="text-center font-bold text-xl">#{player.rank}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Full scoreboard */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Scoreboard</h2>

          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 flex items-center justify-center font-bold mr-3">#{player.rank}</div>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mr-3"
                  style={{ backgroundColor: player.avatar.color }}
                >
                  <div className="relative w-full h-full">
                    <div className="absolute top-3 w-full flex justify-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                      <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                    </div>
                    <div className="absolute top-5 w-full flex justify-center">
                      <div className="w-3 h-1 bg-black rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="font-medium">{player.name}</div>
                </div>

                <div className="font-bold text-lg">{player.score} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={backToHome}>
            Back to Home
          </Button>
          <Button onClick={playAgain}>Play Again</Button>
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useUser } from "@/context/UserContext"
import { useSocket } from "@/context/SocketContext"
import apiClient from "@/lib/apiClient"
import BackgroundCanvas from "@/components/ui/background-canvas"
import type { LobbyRoomDetails, PlayerInLobby, LobbyRoomSettings } from "@/types/index"
import LobbyHeader from "@/components/lobby/lobby-header"
import LobbyTabs from "@/components/lobby/lobby-tabs"
import RoomInfoPanel from "@/components/lobby/room-info-panel"
import { mapToPlayerInLobby } from "@/lib/playerUtils"
import PlayersList from "@/components/lobby/players-list"
import SettingsPanel from "@/components/lobby/settings-panel"
import GlassCard from "@/components/ui/glass-card"
import AnimatedGradientBorder from "@/components/ui/animated-gradient-border"

export default function LobbyPage() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.room_id as string

  const { user: currentUser } = useUser()
  const { socket, isConnected, emitWithAck } = useSocket()

  const [roomDetails, setRoomDetails] = useState<LobbyRoomDetails | null>(null)
  const [localSettings, setLocalSettings] = useState<LobbyRoomSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"players" | "settings">("players")

  // Check if current user is the room creator
  const isCurrentUserCreator = !!(currentUser?.userId && roomDetails?.creatorId === currentUser.userId)

  // Check if settings have been modified
  const settingsHaveChanged: boolean =
    !!roomDetails &&
    !!localSettings &&
    (roomDetails.settings.rounds !== localSettings.rounds || roomDetails.settings.drawTime !== localSettings.drawTime)

  // Initial data fetch and socket join
  useEffect(() => {
    if (!roomId || !currentUser?.userId) {
      if (!currentUser?.userId && !isLoading) router.push("/")
      return
    }

    setIsLoading(true)
    setError(null)

    const fetchRoomData = async () => {
      try {
        const response = await apiClient.get(`/rooms/${roomId}`)
        const data = response.data as LobbyRoomDetails

        const playersInLobby = Array.isArray(data.players) ? data.players.map((p) => mapToPlayerInLobby(p)) : []

        setRoomDetails({ ...data, players: playersInLobby })
        setLocalSettings({
          rounds: data.settings.rounds,
          drawTime: data.settings.drawTime,
        })

        // Join the room via socket if connected
        if (socket && isConnected) {
          emitWithAck("joinRoom", { roomId, userId: currentUser.userId })
            .then((ackResponse: any) => {
              if (ackResponse.error) {
                setError(ackResponse.error)
              } else if (ackResponse.room) {
                const ackRoomData = ackResponse.room as LobbyRoomDetails

                const ackPlayers = Array.isArray(ackRoomData.players)
                  ? ackRoomData.players.map((p) => mapToPlayerInLobby(p))
                  : []

                setRoomDetails((prev: LobbyRoomDetails | null) => ({ ...prev!, ...ackRoomData, players: ackPlayers }))
                setLocalSettings((prev: LobbyRoomSettings | null) => ({ ...prev!, ...ackRoomData.settings }))
              }
            })
            .catch((err) => {
              setError(`Failed to sync with room channel: ${err}`)
            })
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Could not load room.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRoomData()
  }, [roomId, currentUser?.userId, isConnected, socket, router])

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !roomId) return

    // Handle when a new player joins the room
    const handlePlayerJoined = (data: { roomId: string; user: PlayerInLobby; players: PlayerInLobby[] }) => {
      if (data.roomId === roomId) {
        setRoomDetails((prev: LobbyRoomDetails | null) => {
          if (!prev) return null

          const players = Array.isArray(data.players) ? data.players.map((p) => mapToPlayerInLobby(p)) : []

          return { ...prev, players }
        })
      }
    }

    // Handle when a player leaves the room
    const handlePlayerLeft = (data: {
      roomId: string
      userId: string
      username: string
      newCreatorId?: string | null
      players: PlayerInLobby[]
    }) => {
      if (data.roomId === roomId) {
        setRoomDetails((prev) => {
          if (!prev) return null

          // Update the creatorId if provided
          const updatedCreatorId = data.newCreatorId !== undefined ? data.newCreatorId : prev.creatorId

          // Handle players array safely
          let updatedPlayers: PlayerInLobby[] = []

          if (Array.isArray(data.players) && data.players.length > 0) {
            updatedPlayers = data.players.map((p) => mapToPlayerInLobby(p))
          } else {
            // If players is empty or undefined, use current players minus the one who left
            updatedPlayers = prev.players.filter((p) => p.userId !== data.userId)
          }

          return {
            ...prev,
            players: updatedPlayers,
            creatorId: updatedCreatorId,
          }
        })
      }
    }

    // Handle when room creator changes
    const handleRoomCreatorChanged = (data: {
      roomId: string
      newCreatorId: string | null
      newCreatorUsername: string | null
    }) => {
      if (data.roomId === roomId) {
        setRoomDetails((prev) => {
          if (!prev) return null
          return {
            ...prev,
            creatorId: data.newCreatorId,
          }
        })
      }
    }

    // Handle when room settings are updated
    const handleRoomSettingsUpdated = (data: {
      roomId: string
      settings: LobbyRoomSettings & { wordOptions: number }
    }) => {
      if (data.roomId === roomId) {
        setRoomDetails((prev: LobbyRoomDetails | null) => (prev ? { ...prev, settings: data.settings } : null))
        setLocalSettings(data.settings)
      }
    }

    // Handle when game starts
    const handleGameStarted = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
        router.push(`/game/${roomId}`)
      }
    }

    // Handle when rejoining a room
    const handleRejoinedRoom = (data: { roomDetails: LobbyRoomDetails }) => {
      if (!data || !data.roomDetails) {
        return
      }

      const players = Array.isArray(data.roomDetails.players)
        ? data.roomDetails.players.map((p) => mapToPlayerInLobby(p))
        : []

      setRoomDetails({ ...data.roomDetails, players })
      setLocalSettings(data.roomDetails.settings)
      setIsLoading(false)
      setError(null)
    }

    // Handle room deletion or being kicked
    const handleRoomClosed = (data: { roomId: string; reason: string }) => {
      if (data.roomId === roomId) {
        setError(`Room closed: ${data.reason}`)
        setTimeout(() => router.push("/"), 2000)
      }
    }

    // Register socket event listeners
    socket.on("playerJoined", handlePlayerJoined)
    socket.on("playerLeft", handlePlayerLeft)
    socket.on("roomCreatorChanged", handleRoomCreatorChanged)
    socket.on("roomSettingsUpdated", handleRoomSettingsUpdated)
    socket.on("gameStarted", handleGameStarted)
    socket.on("rejoinedRoom", handleRejoinedRoom)
    socket.on("roomClosed", handleRoomClosed)

    // Cleanup function to remove event listeners
    return () => {
      socket.off("playerJoined", handlePlayerJoined)
      socket.off("playerLeft", handlePlayerLeft)
      socket.off("roomCreatorChanged", handleRoomCreatorChanged)
      socket.off("roomSettingsUpdated", handleRoomSettingsUpdated)
      socket.off("gameStarted", handleGameStarted)
      socket.off("rejoinedRoom", handleRejoinedRoom)
      socket.off("roomClosed", handleRoomClosed)
    }
  }, [socket, isConnected, roomId, router])

  // Update game settings via API
  const handleUpdateSettingsAPI = async () => {
    if (!isCurrentUserCreator || !localSettings || !roomDetails || !currentUser) return
    setError(null)
    try {
      await apiClient.put(`/rooms/${roomId}/settings`, {
        userId: currentUser.userId,
        settings: {
          rounds: localSettings.rounds,
          drawTime: localSettings.drawTime,
        },
      })
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not update settings.")
    }
  }

  // Start the game via API
  const handleStartGameAPI = async () => {
    if (!isCurrentUserCreator || !roomDetails || !currentUser) return
    const minPlayers = Number(process.env.NEXT_PUBLIC_MIN_PLAYERS_TO_START) || 2

    if (roomDetails.players.length < minPlayers) {
      setError(`Need at least ${minPlayers} players to start.`)
      return
    }

    setError(null)
    try {
      await apiClient.post(`/rooms/${roomId}/start`, { userId: currentUser.userId })
      // Server will emit 'gameStarted' event which is handled by the socket listener
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not start game.")
    }
  }

  // Leave the lobby and return to home
  const handleLeaveLobby = async () => {
    if (socket && isConnected && currentUser) {
      try {
        await emitWithAck("leaveCurrentRoom", { roomId, userId: currentUser.userId })
      } catch (e) {
        console.error("Error emitting leaveCurrentRoom from lobby:", e)
      }
    }
    router.push("/")
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading Lobby for Room {roomId.toUpperCase()}...</p>
      </div>
    )
  }

  // Error state when room details aren't available
  if (error && !roomDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-red-600">
          Error: {error} <Button onClick={() => router.push("/")}>Go Home</Button>
        </p>
      </div>
    )
  }

  // Missing data state
  if (!roomDetails || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>
          Room data not available or user not loaded. <Button onClick={() => router.push("/")}>Try Home</Button>
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      <BackgroundCanvas />
      <motion.div
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <AnimatedGradientBorder containerClassName="w-full max-w-4xl" borderWidth={2} animationDuration={8}>
          <GlassCard
            className="p-6 sm:p-8 w-full"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
          >
            <LobbyHeader roomId={roomId} onLeaveLobby={handleLeaveLobby} />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-center shadow-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              {/* Left side - Tabs (Players/Settings) */}
              <div className="md:w-2/3 flex flex-col">
                <LobbyTabs
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  playersCount={roomDetails.players.length}
                  isCreator={isCurrentUserCreator}
                  roomStatus={roomDetails.status}
                />

                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === "players" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1"
                >
                  {activeTab === "players" ? (
                    <GlassCard className="p-4 shadow-md" intensity="light">
                      <PlayersList
                        players={roomDetails.players}
                        creatorId={roomDetails.creatorId}
                        currentUserId={currentUser.userId}
                      />
                    </GlassCard>
                  ) : (
                    isCurrentUserCreator &&
                    localSettings &&
                    roomDetails.status === "waiting" && (
                      <GlassCard className="shadow-md" intensity="light">
                        <SettingsPanel
                          localSettings={localSettings}
                          setLocalSettings={setLocalSettings}
                          settingsHaveChanged={settingsHaveChanged}
                          onSaveSettings={handleUpdateSettingsAPI}
                        />
                      </GlassCard>
                    )
                  )}
                </motion.div>
              </div>

              {/* Right side - Game info & Start Button */}
              <RoomInfoPanel
                roomDetails={roomDetails}
                roomId={roomId}
                isCurrentUserCreator={isCurrentUserCreator}
                onStartGame={handleStartGameAPI}
                isLoading={isLoading}
              />
            </div>
          </GlassCard>
        </AnimatedGradientBorder>
      </motion.div>
    </main>
  )
}

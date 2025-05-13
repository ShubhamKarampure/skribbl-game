import type { PlayerInLobby } from "@/types/index"
import { AvatarFeatures } from "@/types/index"

/**
 * Maps a player object from the backend to the PlayerInLobby type
 * Ensures avatar data is properly formatted
 */
export const mapToPlayerInLobby = (backendPlayer: any): PlayerInLobby => {
  const defaultAvatar: AvatarFeatures = {
    color: "#7f7f7f",
    face: "neutral",
    hat: "none",
    accessory: "none",
  }

  return {
    userId: backendPlayer.userId,
    username: backendPlayer.username || "Unknown Player",
    avatar: backendPlayer.avatar && Object.keys(backendPlayer.avatar).length > 0 ? backendPlayer.avatar : defaultAvatar,
  }
}

export interface AvatarFeatures {
  color: string
  face: string
  hat: string
  accessory: string
}

export interface PlayerInLobby { // Or use PlayerFromServer directly
  userId: string;
  username: string;
  avatar: AvatarFeatures; // From your existing types
  isCreator?: boolean; // To easily identify the creator/leader
  // Add other relevant lobby-specific fields if any
}

export interface LobbyRoomSettings {
  rounds: number;
  drawTime: number;
  // wordOptions: number; // From backend Room.settings
  // maxPlayers: number; // From backend Room.maxPlayers
  customWords?: string; // UI specific, might not be directly on Room.settings
  language?: string; // UI specific
}

export interface LobbyRoomDetails {
  roomId: string;
  name: string;
  creatorId: string | null;
  players: PlayerInLobby[];
  maxPlayers: number;
  settings: LobbyRoomSettings & { wordOptions: number }; // Merging for clarity
  status: "waiting" | "playing" | "finished"; // Backend room status
}
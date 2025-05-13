import type { AvatarFeatures } from "./avatar";
// Import or define DrawingEventData type
import type { DrawingEventData } from "./drawing"; // Adjust the path if needed

export interface GamePlayer {
  userId: string;
  username: string;
  avatar: AvatarFeatures;
  score: number;
  isOnline: boolean; // Updated by presence events if implemented
  isCreator?: boolean; // Useful for UI
  // isCurrentlyDrawing?: boolean; // Can be derived from activeRound.drawerId
}

export interface GameSettings { // From backend Room.settings
  rounds: number;
  drawTime: number;
  wordOptions: number;
  customWords?: string; // If backend supports processing this
  language?: string;    // If backend supports this
}

// Represents the overall room state during gameplay
export interface GamePageRoomState {
  roomId: string;
  creatorId: string | null;
  players: GamePlayer[];
  maxPlayers: number;
  settings: GameSettings;
  status: "waiting" | "playing" | "finished";
  currentRoundNumberOverall: number;
  playerDrawOrder: string[]; // Array of userIds
}

// Represents the state of the currently active round
export interface ActiveRoundState {
  roundId: string | null; // From backend Round model
  currentRoundNumber: number;
  drawerId: string | null;
  drawerUsername?: string;
  wordHint: string | null;      // For guessers
  actualWord: string | null;    // For drawer, or revealed at round end
  wordChoices: string[];        // For drawer during word selection
  timeLeftInRound: number;      // Visual timer, driven by server events
  totalDrawTimeForRound: number;
  drawingEvents: DrawingEventData[]; // All drawing events for this round
  // For chat and guesses within this round
  chatAndGuessMessages: Array<{
    type: 'guess' | 'chat' | 'system';
    userId?: string; // Undefined for system messages
    username?: string; // Undefined for system messages
    message: string; // The guess text or chat message
    isCorrect?: boolean; // For guesses
    pointsAwarded?: number; // For guesses
    vectorTimestamp: Record<string, number>;
    timestamp: string; // Server or client timestamp
  }>;
  status: "pending_word_selection" | "drawing" | "ended_timer" | "ended_all_guessed" | "ended_drawer_left" | null;
}

// For guess submission to server
export interface SubmitGuessPayload {
    roomId: string;
    roundId: string;
    guess: string;
    vectorTimestamp: Record<string, number>;
    clientTimestamp?: string;
}

// For chat message submission to server
export interface SendChatMessagePayload {
    roomId: string;
    roundId?: string | null; // Can be null for lobby/general room chat
    message: string;
    vectorTimestamp: Record<string, number>;
    clientTimestamp?: string;
}
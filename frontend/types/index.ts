// src/types/index.ts

// --- From Mongoose Schemas ---

export interface Point {
  x: number;
  y: number;
}

export enum DrawingActionType {
  LINE_START = 'LINE_START',
  LINE_DRAW = 'LINE_DRAW',
  LINE_END = 'LINE_END',
  FILL = 'FILL',
  CLEAR = 'CLEAR',
  UNDO = 'UNDO',
}

export interface DrawingAction {
  type: DrawingActionType;
  points?: Point[];      // For LINE_START, LINE_DRAW, LINE_END
  color?: string;        // For LINE actions, FILL (as fillColor)
  brushSize?: number;    // For LINE actions
  point?: Point;         // For FILL (start point)
}

export interface DrawingEvent {
  userId: string;
  action: DrawingAction;
  vectorTimestamp: Record<string, number>;
  clientTimestamp?: Date | string; 
  roundId?: string;
  username?: string; 
}

export interface GuessEvent {
  userId: string;
  username: string;
  serverTimestamp?: Date | string;
  clientTimestamp?: Date | string;
  vectorTimestamp: Record<string, number>;
  guess: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

export enum MessageType {
  SYSTEM = 'system',
  PLAYER_CHAT = 'player_chat',
}

export interface ChatMessage {
  userId: string;
  username: string;
  serverTimestamp?: Date | string;
  clientTimestamp?: Date | string;
  vectorTimestamp: Record<string, number>;
  message: string;
  messageType: MessageType;
  roundId?: string; 
}

export enum RoundStatus {
  PENDING_WORD_SELECTION = 'pending_word_selection',
  DRAWING = 'drawing',
  ENDED_TIMER = 'ended_timer',
  ENDED_ALL_GUESSED = 'ended_all_guessed',
  ENDED_DRAWER_LEFT = 'ended_drawer_left',
}

export interface Round {
  roundId: string;
  roomId: string;
  currentRoundNumber: number;
  drawerId: string;
  wordToGuess: string; 
  startTime?: Date | string;
  endTime?: Date | string;
  drawingEvents: DrawingEvent[];
  guessEvents: GuessEvent[];
  chatMessages: ChatMessage[];
  status: RoundStatus;
  drawerUsername?: string;
  wordHint?: string | null;
  actualWord?: string | null; 
  wordChoices?: string[];
  timeLeftInRound?: number;
  totalDrawTimeForRound?: number;
}

// --- Frontend Specific Types ---

export interface AvatarData {
  color: string;
  face: string; 
  hat: string;  
  accessory: string; 
}

export interface PlayerCore {
  userId: string;
  username: string;
  avatar: AvatarData;
}

export interface PlayerInLobby extends PlayerCore {
  isCreator: boolean;
  isReady?: boolean; 
}

export interface GamePlayer extends PlayerCore {
  score: number;
  isOnline: boolean;
  isCreator: boolean;
  isDrawing?: boolean;
}

export interface LobbyRoomSettings {
  rounds: number;
  drawTime: number; 
  maxPlayers: number;
  isPrivate: boolean;
  language?: string; 
}

export interface GamePageRoomState {
  roomId: string;
  creatorId: string | null;
  players: GamePlayer[];
  maxPlayers: number;
  settings: LobbyRoomSettings;
  status: "waiting" | "playing" | "finished"; 
  currentRoundNumberOverall: number; 
  playerDrawOrder: string[];
}

export type ClientViewState =
  | "loading"
  | "waiting_for_room"
  | "word_selection"
  | "drawing"
  | "guessing"
  | "round_summary"
  | "waiting_for_round"
  | "game_summary"
  | "error_state";

export interface CanvasPoint { 
    x: number;
    y: number;
}

export interface User {
    userId: string;
    username: string;
    avatar: AvatarData;
}

export interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    vectorClock: { 
        tick: () => void;
        merge: (remoteTimestamp: Record<string, number>) => void;
        toObject: () => Record<string, number>;
        getLocalTime: (actorId: string) => number;
    };
    isLoading: boolean;
}

export interface SocketContextType {
    socket: any | null; 
    isConnected: boolean;
    emitWithAck: <T = any>(event: string, data: any) => Promise<T>;
}

// src/types/game.ts (or your chosen path)

// Base structure for all messages/events in the feed
export interface FeedMessageBase {
  id: string; // Unique key for React rendering
  userId: string;
  username: string;
  timestamp: string; // ISO Date string, standardized to serverTimestamp
  vectorTimestamp: Record<string, number>; // Assuming this is part of all messages
}

// For player chat messages or system announcements
export interface ChatFeedMessageClient extends FeedMessageBase {
  type: "chat" | "system"; // 'system' for system messages, 'chat' for player chat
  message: string;
}

export interface GuessFeedMessageClient extends FeedMessageBase {
  type: "guess";
  message: string; // The content of the guess
  isCorrect: boolean;
  pointsAwarded: number;
}

export type FeedMessage = ChatFeedMessageClient | GuessFeedMessageClient;


export type DisplayableMessage = (ChatMessage | GuessEvent) & { displayType: 'chat' | 'guess' | 'system' };

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react"; // Added useRef
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { useSocket } from "@/context/SocketContext";
import GamePlayArea, { type DrawingAction } from "@/components/game/game-play-area";
import PlayerSidebar from "@/components/game/player-sidebar";
import ChatSidebar from "@/components/game/chat-sidebar";
import GameSummary from "@/components/game/game-summary";
import LoadingState from "@/components/game/loading-state";
import ErrorState from "@/components/game/error-state";
import WordSelectionModal from "@/components/game/word-selection";

import type { PlayerInLobby, LobbyRoomSettings, AvatarFeatures as AvatarData } from "@/types/avatar";
import type { GamePageRoomState, ClientViewState } from "@/types/game-room";

// Type Definitions (can be in a shared types file e.g. @/types/game.ts)
export interface GamePlayer extends PlayerInLobby {
  score: number;
  isOnline: boolean;
  isCreator: boolean;
  isDrawing?: boolean;
}

export interface DrawingEventFromServer {
  userId: string;
  action: DrawingAction;
  vectorTimestamp: Record<string, number>;
  clientTimestamp?: string;
  // If your server adds roundId to drawing events, which is good practice:
  roundId?: string;
}

export interface FeedMessageBase {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  vectorTimestamp: Record<string, number>;
}

export interface ChatFeedMessageClient extends FeedMessageBase {
  type: "chat" | "system";
  message: string;
}

export interface GuessFeedMessageClient extends FeedMessageBase {
  type: "guess";
  message: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

export type FeedMessage = ChatFeedMessageClient | GuessFeedMessageClient;

interface PlayerGuessedServerData {
    roomId: string;
    roundId: string;
    userId: string;
    username: string;
    guess: string;
    isCorrect: boolean;
    pointsAwarded: number;
    vectorTimestamp: Record<string, number>;
    serverTimestamp: string;
}

interface NewChatMessageServerData {
    _id?: string;
    roomId: string;
    roundId: string | null;
    userId: string;
    username: string;
    message: string;
    vectorTimestamp: Record<string, number>;
    clientTimestamp?: string;
    serverTimestamp: string;
    messageType: 'system' | 'player_chat';
}

interface ActiveRoundState {
  roundId: string | null;
  currentRoundNumber: number;
  drawerId: string | null;
  drawerUsername?: string;
  wordHint: string | null;
  actualWord: string | null;
  wordChoices: string[];
  timeLeftInRound: number;
  totalDrawTimeForRound: number;
  drawingEvents: DrawingEventFromServer[];
  chatAndGuessMessages: FeedMessage[];
  status: "pending_word_selection" | "drawing" | "ended_timer" | "ended_all_guessed" | "ended_drawer_left" | null;
}

// --- Sound Playback Utility ---
const playSound = (soundFile: string) => {
  try {
    // Ensure sound files are in public/sounds/
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.play().catch(error => console.error(`Error playing sound ${soundFile}:`, error));
  } catch (error) {
    console.error(`Failed to create audio for ${soundFile}:`, error);
  }
};


// Helper function to map server chat/guess events to client FeedMessage format
const mapServerEventsToFeedMessages = (
    serverChatMessages: NewChatMessageServerData[] = [],
    serverGuessEvents: PlayerGuessedServerData[] = []
): FeedMessage[] => {
    const combined: FeedMessage[] = [];

    serverChatMessages.forEach(msg => {
        combined.push({
            id: msg._id || `chat-${msg.serverTimestamp}-${msg.userId.slice(-4)}-${Math.random().toString(36).substr(2, 5)}`,
            type: msg.messageType === 'system' ? 'system' : 'chat',
            userId: msg.userId,
            username: msg.username,
            message: msg.message,
            timestamp: new Date(msg.serverTimestamp).toISOString(),
            vectorTimestamp: msg.vectorTimestamp,
        } as ChatFeedMessageClient);
    });

    serverGuessEvents.forEach(guess => {
        combined.push({
            id: `guess-${guess.serverTimestamp}-${guess.userId.slice(-4)}-${Math.random().toString(36).substr(2, 5)}`,
            type: 'guess',
            userId: guess.userId,
            username: guess.username,
            message: guess.guess,
            isCorrect: guess.isCorrect,
            pointsAwarded: guess.pointsAwarded,
            timestamp: new Date(guess.serverTimestamp).toISOString(),
            vectorTimestamp: guess.vectorTimestamp,
        } as GuessFeedMessageClient);
    });

    combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return combined;
};


export default function GamePlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.room_id as string;

  const { user: currentUser, vectorClock } = useUser();
  const { socket, isConnected, emitWithAck } = useSocket();

  const [roomState, setRoomState] = useState<GamePageRoomState | null>(null);
  const [activeRound, setActiveRound] = useState<ActiveRoundState | null>(null);
  const [clientView, setClientView] = useState<ClientViewState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [showWordSelectionModal, setShowWordSelectionModal] = useState(false);
  const [time, setTime] = useState<number>(0);
  
  const lastPlayedTickTimeRef = useRef<number | null>(null);

  const isMyTurnToDraw = useMemo(() => {
    return activeRound?.drawerId === currentUser?.userId;
  }, [activeRound?.drawerId, currentUser?.userId]);

  const mapToGamePlayer = useCallback((
    p: any,
    currentScores: Record<string, number>, 
    creatorId: string | null,
    currentDrawerId: string | null
  ): GamePlayer => ({
    userId: p.userId,
    username: p.username || "Player",
    avatar: p.avatar || { color: "#ccc", face: "neutral", hat: "none", accessory: "none" } as AvatarData,
    score: currentScores[p.userId] || p.score || 0,
    isOnline: true, 
    isCreator: String(p.userId) === String(creatorId),
    isDrawing: String(p.userId) === String(currentDrawerId),
  }), []);

  const handlePlayerGuessed = useCallback((data: PlayerGuessedServerData) => {
      if (!currentUser || data.roomId !== roomId) return;
      vectorClock.merge(data.vectorTimestamp);

      if (data.isCorrect) {
        playSound("playerGuessed.ogg");
      }

      const guessEntry: GuessFeedMessageClient = {
          id: `guess-${data.serverTimestamp}-${data.userId.slice(-4)}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'guess',
          userId: data.userId,
          username: data.username,
          message: data.guess,
          isCorrect: data.isCorrect,
          pointsAwarded: data.pointsAwarded,
          timestamp: new Date(data.serverTimestamp).toISOString(),
          vectorTimestamp: data.vectorTimestamp,
      };

      setActiveRound(prevActiveRound => {
          if (prevActiveRound && data.roundId && prevActiveRound.roundId === data.roundId) {
              const updatedMessages = [...prevActiveRound.chatAndGuessMessages, guessEntry].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              return {
                  ...prevActiveRound,
                  chatAndGuessMessages: updatedMessages,
              };
          }
          console.warn("Guess received for non-active or non-matching round. Ignored for activeRound.", { data, activeRoundId: prevActiveRound?.roundId });
          return prevActiveRound;
      });

      if (data.isCorrect) {
          setRoomState(prevRoom => {
              if (!prevRoom || prevRoom.roomId !== data.roomId) return prevRoom;
              const newPlayers = prevRoom.players.map(p => {
                  let scoreAddition = 0;
                  if (p.userId === data.userId) scoreAddition = data.pointsAwarded;
                  return { ...p, score: (p.score || 0) + scoreAddition };
              });
              return { ...prevRoom, players: newPlayers };
          });
      }
  }, [roomId, vectorClock, currentUser, setRoomState]);

  const handleNewChatMessage = useCallback((data: NewChatMessageServerData) => {
      if (!currentUser || data.roomId !== roomId) return;
      vectorClock.merge(data.vectorTimestamp);

      // Example: Play 'join' or 'leave' sound if it's a system message indicating such
      // This depends on your server sending specific system messages for joins/leaves via chat
      // if (data.messageType === 'system' && data.message.includes('joined')) {
      //   playSound('join.ogg');
      // } else if (data.messageType === 'system' && data.message.includes('left')) {
      //   playSound('leave.ogg');
      // }

      const chatEntry: ChatFeedMessageClient = {
          id: data._id || `chat-${data.serverTimestamp}-${data.userId.slice(-4)}-${Math.random().toString(36).substr(2, 5)}`,
          type: data.messageType === 'system' ? 'system' : 'chat',
          userId: data.userId,
          username: data.username,
          message: data.message,
          timestamp: new Date(data.serverTimestamp).toISOString(),
          vectorTimestamp: data.vectorTimestamp,
      };

      setActiveRound(prevActiveRound => {
          if (prevActiveRound && data.roundId && prevActiveRound.roundId === data.roundId) {
              return {
                  ...prevActiveRound,
                  chatAndGuessMessages: [...prevActiveRound.chatAndGuessMessages, chatEntry].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
              };
          }
          // If roundId is null (e.g. chat in game summary), or message is for current active round
          // Or if there is no active round (e.g. game finished, chat still possible)
          // This part might need adjustment based on when chat messages can arrive
          if (!prevActiveRound && !data.roundId) { // Chat outside a round
             // Potentially handle chat messages for game summary view if needed
          } else if (prevActiveRound && (!data.roundId || prevActiveRound.roundId === data.roundId)) {
             // If it's for the current round or a general message
             return {
                ...prevActiveRound,
                chatAndGuessMessages: [...prevActiveRound.chatAndGuessMessages, chatEntry].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
             };
          }
          console.warn("Chat message received for non-active or non-matching round. Ignored for activeRound.", { data, activeRoundId: prevActiveRound?.roundId });
          return prevActiveRound;
      });
  }, [roomId, vectorClock, currentUser]);


  useEffect(() => {
    if (!roomId || !currentUser?.userId || !socket || !isConnected) {
        if (!currentUser?.userId && clientView !== "error_state" && clientView !== "loading") {
            // router.push("/"); 
        }
        return;
    }

    if (clientView !== "loading" && clientView !== "error_state" && roomState !== null) {
        return;
    }
    
    console.log(`GamePlayPage: Attempting to confirm/rejoin room ${roomId} for user ${currentUser.userId}`);
    setClientView("loading");
    setError(null);

    emitWithAck("joinRoom", { roomId, userId: currentUser.userId })
      .then((response: any) => {
        if (response.error) {
          throw new Error(response.error);
        }
        console.log("GamePlayPage: Successfully joined/rejoined room channel:", response.data);

        if (response.data) {
          const { roomDetails: gameRoom, currentRoundData: svrRound, scores: svrScores = {} } = response.data;

          if (gameRoom.status === "waiting") {
            router.push(`/lobby/${roomId}`);
            return;
          }
          
          // Play join sound when successfully joining a game in progress or starting
          if (gameRoom.status === "playing" || gameRoom.status === "finished") {
            playSound("join.ogg"); 
          }

          const currentDrawerIdForPlayerMap = svrRound?.drawerId || gameRoom.currentDrawerId || null;
          const scoresByUserId: Record<string, number> = {};
          if (gameRoom.players && svrScores) {
            gameRoom.players.forEach((p: any) => {
                if (svrScores[p.username] !== undefined) {
                    scoresByUserId[p.userId] = svrScores[p.username];
                }
            });
          }

          const gamePlayers = gameRoom.players.map((p: any) => mapToGamePlayer(p, scoresByUserId, gameRoom.creatorId, currentDrawerIdForPlayerMap));
          setRoomState({ ...gameRoom, players: gamePlayers });

          if (gameRoom.status === "playing" && svrRound) {
            const initialFeedMessages = mapServerEventsToFeedMessages(
                svrRound.chatMessages || [],
                svrRound.guessEvents || []
            );
            setActiveRound({
                roundId: svrRound.roundId || svrRound._id?.toString(),
                currentRoundNumber: svrRound.currentRoundNumber,
                drawerId: svrRound.drawerId,
                drawerUsername: gamePlayers.find(p => String(p.userId) === String(svrRound.drawerId))?.username,
                wordHint: svrRound.wordHint,
                actualWord: svrRound.wordToGuess, // Server sends wordToGuess if user is drawer or round ended
                wordChoices: svrRound.wordChoices || [],
                timeLeftInRound: svrRound.timeLeftInRound ?? svrRound.totalDrawTimeForRound ?? gameRoom.settings.drawTime,
                totalDrawTimeForRound: svrRound.totalDrawTimeForRound ?? gameRoom.settings.drawTime,
                drawingEvents: svrRound.drawingEvents || [],
                chatAndGuessMessages: initialFeedMessages,
                status: svrRound.status,
            });
            
            const isDrawerNow = String(svrRound.drawerId) === String(currentUser.userId);
            if (isDrawerNow && svrRound.status === "pending_word_selection") {
              setClientView("word_selection");
              setShowWordSelectionModal(true);
            } else if (isDrawerNow && svrRound.status === "drawing") {
              setClientView("drawing");
            } else if (svrRound.status === "drawing") {
              setClientView("guessing");
            } else if (svrRound.status && svrRound.status.startsWith("ended_")){
              setClientView("round_summary");
            } else {
              setClientView("waiting_for_room"); 
            }
          } else if (gameRoom.status === "finished") {
            setClientView("game_summary");
            if (svrRound) { 
                const finalFeedMessages = mapServerEventsToFeedMessages(svrRound.chatMessages || [], svrRound.guessEvents || []);
                setActiveRound({
                    roundId: svrRound.roundId || svrRound._id?.toString(),
                    currentRoundNumber: svrRound.currentRoundNumber,
                    drawerId: svrRound.drawerId,
                    drawerUsername: gamePlayers.find(p => String(p.userId) === String(svrRound.drawerId))?.username,
                    wordHint: svrRound.wordHint,
                    actualWord: svrRound.wordToGuess,
                    wordChoices: [],
                    timeLeftInRound: 0,
                    totalDrawTimeForRound: svrRound.totalDrawTimeForRound ?? gameRoom.settings.drawTime,
                    drawingEvents: svrRound.drawingEvents || [],
                    chatAndGuessMessages: finalFeedMessages,
                    status: svrRound.status as any, // Assuming status like 'ended_all_rounds'
                   });
            }
          } else {
            setClientView("waiting_for_room");
          }
        } else {
            throw new Error("No data received on joinRoom acknowledgment.");
        }
      })
      .catch((err) => {
        console.error("GamePlayPage: Error joining room channel:", err);
        setError(`Failed to join game: ${err.message || String(err)}.`);
        setClientView("error_state");
      });
  }, [roomId, currentUser?.userId, socket, isConnected, emitWithAck, router, mapToGamePlayer, clientView, roomState]); // roomState was in deps, careful if it causes re-joins


  useEffect(() => {
    if (!socket || !isConnected || !currentUser) return;

    const handleGameStarted = (data: { roomId: string; settings: LobbyRoomSettings; playerDrawOrder: string[]; players: any[] }) => {
        if (data.roomId !== roomId) return;
        // playSound("join.ogg"); // Or a more general "game ready" sound if join.ogg is specific to *user* joining
        const scoresByUserId: Record<string, number> = {};
         data.players.forEach((p: any) => {
            scoresByUserId[p.userId] = p.score || 0;
        });

        setRoomState((prev) => {
            const currentDrawerId = prev?.players.find(p => p.isDrawing)?.userId || data.playerDrawOrder?.[0] || null;
            const gamePlayers = data.players.map((p: any) => mapToGamePlayer(p, scoresByUserId, prev?.creatorId || null, currentDrawerId));
            return prev ? { ...prev, status: "playing", settings: data.settings, playerDrawOrder: data.playerDrawOrder, players: gamePlayers } : 
                         { /* initial room state if prev is null, might need more fields from data */
                            roomId: data.roomId,
                            status: "playing",
                            settings: data.settings,
                            playerDrawOrder: data.playerDrawOrder,
                            players: gamePlayers,
                            creatorId: null, // Determine creatorId if possible
                            currentRoundNumberOverall: 0, // Initial
                         };
        });
    };

    const handleNewRoundStarting = (data: {
      roomId: string; currentRoundNumber: number; totalRounds: number;
      drawer: { userId: string; username: string }; drawTime: number; currentRoundId: string;
    }) => {
      if (data.roomId !== roomId) return;
      // playSound("roundStart.ogg"); // Moved to drawingPhaseStarted for when actual drawing begins
      setRoomState((prev) => prev ? {
        ...prev,
        currentRoundNumberOverall: data.currentRoundNumber,
        settings: { ...prev.settings, rounds: data.totalRounds, drawTime: data.drawTime },
        players: prev.players.map(p => ({ ...p, isDrawing: String(p.userId) === String(data.drawer.userId) }))
      } : null);

      setActiveRound({
        roundId: data.currentRoundId,
        currentRoundNumber: data.currentRoundNumber,
        drawerId: data.drawer.userId,
        drawerUsername: data.drawer.username,
        wordHint: null, actualWord: null, wordChoices: [],
        timeLeftInRound: data.drawTime, totalDrawTimeForRound: data.drawTime,
        drawingEvents: [], chatAndGuessMessages: [], status: "pending_word_selection",
      });

      setShowWordSelectionModal(false); // Close any previous modal
      if (String(data.drawer.userId) === String(currentUser.userId)) {
        setClientView("word_selection");
      } else {
        setClientView("guessing"); // Or a "Waiting for drawer to pick word" view
      }
    };
    
    const handleYourTurnToDraw = (data: { wordChoices: string[] }) => {
        // This event comes specifically to the drawer
        if(String(activeRound?.drawerId) !== String(currentUser.userId) && activeRound?.status !== "pending_word_selection") {
            console.warn("Received yourTurnToDraw but not my turn or round not pending selection.");
            return;
        }
        setActiveRound((prev) => prev ? { ...prev, wordChoices: data.wordChoices, status: "pending_word_selection" } : null);
        setShowWordSelectionModal(true);
        setClientView("word_selection"); 
    };

    const handleDrawingPhaseStarted = (data: {
      roomId: string; drawerId: string; wordHint: string; wordToGuess: string; drawTime: number; currentRoundId: string;
    }) => {
      if (data.roomId !== roomId ) return;
      if (activeRound && data.currentRoundId !== activeRound.roundId && activeRound.status !== "pending_word_selection") {
        console.warn("Stale drawingPhaseStarted event or unexpected state.", { data, activeRound });
        return;
      }
      
      playSound("roundStart.ogg");

      setActiveRound((prev) => {
        if (prev && prev.roundId === data.currentRoundId && prev.status === "pending_word_selection") {
            return {
              ...prev,
              wordToGuess: data.wordToGuess,
                wordHint: data.wordHint,
                status: "drawing",
                // timeLeftInRound: data.drawTime, // Might already be set by newRoundStarting or joinRoom
                // totalDrawTimeForRound: data.drawTime, // ditto
            };
        }
        // If not pending_word_selection, it might be a late join, update hint if round matches
        if (prev && prev.roundId === data.currentRoundId && prev.status === "drawing" && !prev.wordHint) {
            return {...prev, wordHint: data.wordHint};
        }
        return prev; 
      });
      setShowWordSelectionModal(false);
      setClientView(String(data.drawerId) === String(currentUser.userId) ? "drawing" : "guessing");
    };
    
    const handleNewDrawingAction = (eventData: DrawingEventFromServer) => {
        // Ensure it's for the current active round and not from the current user (canvas handles own actions)
        if (!activeRound || eventData.userId === currentUser.userId || (eventData.roundId && eventData.roundId !== activeRound.roundId)) {
            if(eventData.userId === currentUser.userId) return; // Expected
            console.warn("Ignoring drawing action:", {eventData, activeRoundId: activeRound?.roundId, currentUserId: currentUser.userId});
            return;
        }
        setActiveRound((prev) => {
            // Double check roundId inside setter if eventData provides it
            if (!prev || (eventData.roundId && prev.roundId !== eventData.roundId)) return prev;
            return { ...prev, drawingEvents: [...prev.drawingEvents, eventData] };
        });
        vectorClock.merge(eventData.vectorTimestamp);
    };

    const handletimeChange = (data: { timeLeftInRound: number }) => {
      setTime(data.timeLeftInRound);
      if (data.timeLeftInRound <= 10) {
        playSound("tick.ogg");
     } 
    }
    
    
    const handleRoundOver = (data: {
      roomId: string; roundId: string; roundNumber: number; reason: string; // e.g., "timer", "all_guessed", "drawer_left"
      word: string; scores: Array<{ userId: string; username: string; score: number; change: number }>;
      drawingEvents?: DrawingEventFromServer[];
    }) => {
        if(data.roomId !== roomId || !activeRound || activeRound.roundId !== data.roundId) {
            console.warn("Stale roundOver event received", {eventData: data, currentRound: activeRound});
            return;
        }

        // Determine if word was actually guessed by someone other than drawer for success sound
        // This is a simple check; server should ideally send a more explicit success flag
        let wasGuessedByOthers = data.scores.some(s => s.change > 0 && s.userId !== activeRound.drawerId);
        if (data.reason === 'all_guessed') {
            wasGuessedByOthers = true; // Explicit reason
        }

        if (data.reason === 'all_guessed' || (data.reason === 'timer' && wasGuessedByOthers)) {
            playSound("roundEndSuccess.ogg");
        } else if (data.reason === 'drawer_left' || (data.reason === 'timer' && !wasGuessedByOthers)) {
            playSound("roundEndFailure.ogg");
        }
        // Reset tick ref for next round
        lastPlayedTickTimeRef.current = null;
     
        setActiveRound(prev => prev ? {
          ...prev,
          actualWord: data.word,
          status: ("ended_" + data.reason) as any, // e.g., "ended_timer"
          drawingEvents: data.drawingEvents || prev.drawingEvents, 
          timeLeftInRound: 0,
        } : null);
    
        setRoomState(prevRoom => {
          if (!prevRoom) return null;
          const updatedPlayers = prevRoom.players.map(p => {
            const scoreData = data.scores.find(s => s.userId === p.userId);
            return {
              ...p,
              score: scoreData?.score ?? p.score,
              isDrawing: false 
            };
          });
          
          const isGameActuallyOver = data.roundNumber >= prevRoom.settings.rounds || data.reason === 'not_enough_players' || data.reason === 'all_rounds_completed';
          if (isGameActuallyOver) { // This logic might conflict with a separate "gameOver" event
            setClientView("game_summary");
          } else {
            setClientView("round_summary");
          }
          return { ...prevRoom, players: updatedPlayers, status: isGameActuallyOver ? "finished" : prevRoom.status };
        });
    };
    
    const handleGameOver = (data: { roomId: string; finalScores: Array<{ userId: string; username: string; score: number }>; reason: string }) => {
        if (data.roomId !== roomId) return;
        // Potentially play a game over sound here (not requested, but an idea)
        // e.g. playSound("gameOver.ogg");

        setRoomState(prevRoom => {
            if (!prevRoom) return null;
            const updatedPlayers = prevRoom.players.map(p => {
                const serverScoreData = data.finalScores.find((s: any) => s.userId === p.userId);
                return { ...p, score: serverScoreData ? serverScoreData.score : p.score, isDrawing: false };
            });
            return { ...prevRoom, players: updatedPlayers, status: "finished" };
        });
        // activeRound might be kept to show last word/drawing in summary
        setClientView("game_summary");
    };

    const handlePlayerLeftMidGame = (data: { roomId: string; userId: string; newPlayerDrawOrder: string[] }) => {
        if (data.roomId === roomId) {
            playSound("leave.ogg");
            setRoomState(prev => {
                if (!prev) return null;
                const leftPlayer = prev.players.find(p => p.userId === data.userId);
                console.log(`${leftPlayer?.username || 'A player'} left the game.`);
                // Add system message to chat?
                return {
                    ...prev,
                    players: prev.players.filter(p => p.userId !== data.userId),
                    playerDrawOrder: data.newPlayerDrawOrder || prev.playerDrawOrder.filter(id => id !== data.userId),
                };
            });
        }
    };

    socket.on("gameStarted", handleGameStarted);
    socket.on("newRoundStarting", handleNewRoundStarting);
    socket.on("yourTurnToDraw", handleYourTurnToDraw);
    socket.on("drawingPhaseStarted", handleDrawingPhaseStarted);
    socket.on("newDrawingAction", handleNewDrawingAction);
    socket.on("playerGuessed", handlePlayerGuessed); 
    socket.on("newChatMessage", handleNewChatMessage); 
    socket.on("roundOver", handleRoundOver);
    socket.on("gameOver", handleGameOver);
    socket.on("playerLeftMidGame", handlePlayerLeftMidGame);
    socket.on("gameTimerUpdate", handletimeChange);

    return () => {
      socket.off("gameStarted", handleGameStarted);
      socket.off("newRoundStarting", handleNewRoundStarting);
      socket.off("yourTurnToDraw", handleYourTurnToDraw);
      socket.off("drawingPhaseStarted", handleDrawingPhaseStarted);
      socket.off("newDrawingAction", handleNewDrawingAction);
      socket.off("playerGuessed", handlePlayerGuessed);
      socket.off("newChatMessage", handleNewChatMessage);
      socket.off("roundOver", handleRoundOver);
      socket.off("gameOver", handleGameOver);
      socket.off("playerLeftMidGame", handlePlayerLeftMidGame);
      socket.off("gameTimerUpdate", handletimeChange);
    };
  }, [socket, isConnected, roomId, currentUser, vectorClock, activeRound, handlePlayerGuessed, handleNewChatMessage, mapToGamePlayer]);


  const onWordSelect = useCallback(async (word: string) => {
    if (!isMyTurnToDraw || !socket || !vectorClock || !activeRound?.roundId || clientView !== "word_selection") {
      console.error("Cannot select word: Conditions not met.");
      return;
    }
    vectorClock.tick();
    setShowWordSelectionModal(false); 

    try {
      const ack = await emitWithAck("wordSelectedByDrawer", {
        roomId,
        roundId: activeRound.roundId,
        word,
        vectorTimestamp: vectorClock.toObject(),
        clientTimestamp: new Date().toISOString(),
      });
      if (ack && ack.error) {
        throw new Error(ack.error);
      }
      // Server will emit 'drawingPhaseStarted' which will trigger sound and view change
    } catch (err) {
      console.error("Error selecting word:", err);
      setShowWordSelectionModal(true); 
      setError(`Could not select word: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [ isMyTurnToDraw, socket, vectorClock, activeRound, roomId, emitWithAck, clientView ]);

  const handleEmitDrawingAction = useCallback((action: DrawingAction) => {
    if (!isMyTurnToDraw || !socket || !vectorClock || !activeRound?.roundId || clientView !== "drawing" || !currentUser) {
      console.warn("Cannot send drawing action: Conditions not met.");
      return;
    }
    vectorClock.tick();
    
    const drawingEvent: DrawingEventFromServer = {
        userId: currentUser.userId,
        action,
        vectorTimestamp: vectorClock.toObject(),
        clientTimestamp: new Date().toISOString(),
        roundId: activeRound.roundId, // Good to include roundId here
    };
    // Optimistically add to local state for responsiveness for the drawer
    // setActiveRound(prev => prev ? { ...prev, drawingEvents: [...prev.drawingEvents, drawingEvent] } : null);
    // Note: The GamePlayArea canvas might handle displaying local drawing actions immediately.
    // Broadcasting it and receiving it back via newDrawingAction might be one way to sync,
    // or the canvas can draw locally and then this just emits. The current setup implies
    // that newDrawingAction handles drawing for OTHERS, and local drawing is handled by canvas directly.

    socket.emit("drawingAction", {
      roomId,
      roundId: activeRound.roundId,
      action,
      vectorTimestamp: vectorClock.toObject(),
      clientTimestamp: new Date().toISOString(),
    });
  }, [isMyTurnToDraw, socket, vectorClock, activeRound, roomId, clientView, currentUser]);
  
  const onChatMessageSubmit = useCallback(async (message: string, isGuess: boolean) => {
    if (!socket || !vectorClock || !roomState || (!activeRound?.roundId && roomState.status === "playing") || !currentUser) {
      console.warn("Cannot send message/guess: prerequisites not met.");
      return;
    }
    vectorClock.tick();
    const payload = {
      roomId,
      roundId: activeRound?.roundId, // Can be null if chatting in game summary/finished state
      message,
      vectorTimestamp: vectorClock.toObject(),
      clientTimestamp: new Date().toISOString(),
    };
    try {
      if (isGuess && roomState.status === "playing" && activeRound?.roundId && !isMyTurnToDraw) {
        const ackResult = await emitWithAck("submitGuess", payload );
        if (ackResult && ackResult.error && !ackResult.alreadyGuessed) {
            setError(ackResult.error);
        } else if (ackResult && ackResult.alreadyGuessed) {
            console.log("User already guessed correctly.");
        }
      } else if (!isGuess) {
        await emitWithAck("sendChatMessage", payload);
      }
    } catch (err) {
      console.error(`Error sending ${isGuess ? "guess" : "chat"}:`, err);
      setError(`Could not send ${isGuess ? "guess" : "chat"}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [socket, vectorClock, roomState, activeRound, roomId, emitWithAck, isMyTurnToDraw, currentUser]);

  const handleLeaveGame = useCallback(async () => {
    if (socket && isConnected && currentUser && roomId) {
      try {
        playSound("leave.ogg"); // Play leave sound for current user
        socket.emit("leaveCurrentRoom", { roomId, userId: currentUser.userId });
      } catch (e) {
        console.error("Error emitting leaveCurrentRoom from game:", e);
      }
    }
    router.push("/");
  }, [socket, isConnected, currentUser, roomId, router]);

  const handleReturnToLobby = useCallback(() => {
    router.push(`/lobby/${roomId}`);
  }, [router, roomId]);

  if (clientView === "loading" || !currentUser || (!roomState && clientView !== 'error_state')) {
    return <LoadingState roomId={roomId} error={error} />;
  }

  if (clientView === "error_state" || !roomState) {
    return <ErrorState error={error || "Failed to load room information."} onGoHome={() => router.push("/")} />;
  }
  
  if (clientView === "game_summary") {
    return (
      <GameSummary players={roomState.players} onReturnToLobby={handleReturnToLobby} onLeaveGame={handleLeaveGame} />
    );
  }

  const wordSelectionComponent = isMyTurnToDraw && clientView === "word_selection" && showWordSelectionModal && activeRound ? (
    <WordSelectionModal
      isOpen={true}
      wordChoices={activeRound.wordChoices}
      onSelect={onWordSelect}
      onClose={() => { 
          // setShowWordSelectionModal(false); // Decide if user can close it. Usually server timeout forces progress.
      }}
    />
  ) : null;

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-900">
      <motion.div
        className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <PlayerSidebar
          players={roomState.players}
          currentUserId={currentUser.userId}
          drawerId={activeRound?.drawerId || roomState.currentDrawerId || null}
          roundNumber={activeRound?.currentRoundNumber || roomState.currentRoundNumberOverall || 0}
          totalRounds={roomState.settings.rounds}
          onLeaveGame={handleLeaveGame}
        />

        <GamePlayArea
          clientView={clientView}
          activeRound={activeRound} 
          isMyTurnToDraw={isMyTurnToDraw}
          timeLeft = {time}
          currentUser={currentUser}
          currentColor={currentColor}
          brushSize={brushSize}
          onColorChange={setCurrentColor}
          onBrushSizeChange={setBrushSize}
          onEmitDrawAction={handleEmitDrawingAction} 
        />

        <ChatSidebar
          chatMessages={activeRound?.chatAndGuessMessages || []}
          onSendMessage={onChatMessageSubmit}
          currentUserId={currentUser.userId}
          isDrawing={isMyTurnToDraw}
          isGamePlaying={clientView === "drawing" || clientView === "guessing"}
          currentDrawerId={activeRound?.drawerId || null}
        />
      </motion.div>
      {wordSelectionComponent}
    </main>
  );
}
"use client";

import { useState, useEffect, useCallback, useMemo } from "react"; // Added useCallback, useMemo
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useUser } from "@/context/UserContext";
import { useSocket } from "@/context/SocketContext";
import GamePlayArea from "@/components/game/game-play-area";
import PlayerSidebar from "@/components/game/player-sidebar";
import ChatSidebar from "@/components/game/chat-sidebar";
import GameSummary from "@/components/game/game-summary";
import LoadingState from "@/components/game/loading-state";
import ErrorState from "@/components/game/error-state";
import WordSelectionModal from "@/components/game/word-selection";

// Assuming these types are well-defined and imported
import type { PlayerInLobby, LobbyRoomSettings, AvatarFeatures as AvatarData } from "@/types/avatar";

// Game player type with score and online status
interface GamePlayer extends PlayerInLobby {
  score: number;
  isOnline: boolean;
  isCreator: boolean; // Added from mapToGamePlayer logic
  isDrawing?: boolean; // Optional: to indicate current drawer in player list
}

// DrawingEvent as received from server / to be stored in activeRound
export interface DrawingEventFromServer {
  userId: string;
  action: DrawingAction; // This is the type for server-level actions
  vectorTimestamp: Record<string, number>;
  clientTimestamp?: string;
}


// Active round state interface
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
  drawingEvents: DrawingEventFromServer[]; // Use the specific type
  chatAndGuessMessages: Array<any>; // Define a proper type for chat/guess messages
  status: "pending_word_selection" | "drawing" | "ended_timer" | "ended_all_guessed" | "ended_drawer_left" | null;
}

// Game room state interface
interface GamePageRoomState {
  roomId: string;
  creatorId: string | null;
  players: GamePlayer[];
  maxPlayers: number;
  settings: LobbyRoomSettings;
  status: "waiting" | "playing" | "finished";
  currentRoundNumberOverall: number;
  playerDrawOrder: string[];
}

// Client view states
type ClientViewState =
  | "loading"
  | "waiting_for_room"
  | "waiting_for_round"
  | "word_selection"
  | "drawing"
  | "guessing"
  | "round_summary"
  | "game_summary"
  | "error_state";

// const DEFAULT_DRAW_TIME = 80; // Fallback - already present

export default function GamePlayPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.room_id as string;

  const { user: currentUser, vectorClock } = useUser(); // Assume vectorClock is stable or its changes are handled
  const { socket, isConnected, emitWithAck } = useSocket(); // Assume emitWithAck is stable

  // Core Game State
  const [roomState, setRoomState] = useState<GamePageRoomState | null>(null);
  const [activeRound, setActiveRound] = useState<ActiveRoundState | null>(null);
  const [clientView, setClientView] = useState<ClientViewState>("loading");
  // const [isMyTurnToDraw, setIsMyTurnToDraw] = useState(false); // Derived from activeRound and currentUser
  const [error, setError] = useState<string | null>(null);

  // Drawing tool state
  const [currentColor, setCurrentColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);

  // Word selection modal state
  const [showWordSelectionModal, setShowWordSelectionModal] = useState(false);

  const isMyTurnToDraw = useMemo(() => {
    return activeRound?.drawerId === currentUser?.userId;
  }, [activeRound?.drawerId, currentUser?.userId]);


  const mapToGamePlayer = useCallback((
    p: any, // Player data from server
    currentScores: Record<string, number>,
    creatorId: string | null,
    currentDrawerId: string | null
  ): GamePlayer => ({
    userId: p.userId,
    username: p.username || "Player",
    avatar: p.avatar || { color: "#ccc", face: "neutral", hat: "none", accessory: "none" } as AvatarData,
    score: currentScores[p.userId] || p.score || 0,
    isOnline: true, // Server should ideally provide this
    isCreator: p.userId === creatorId,
    isDrawing: p.userId === currentDrawerId,
  }), []);


  // Initial data load / Rejoin logic
  useEffect(() => {
    if (!roomId || !currentUser?.userId || !socket || !isConnected) {
      if (!currentUser?.userId && clientView !== "error_state" && clientView !== "loading") {
        // router.push("/"); // Redirect if user is lost, but ensure this doesn't loop if conditions flap
      }
      return;
    }

    if (clientView !== "loading" && clientView !== "error_state" && roomState !== null) {
        // Already loaded or in an error state, or room state is set
        // This check prevents re-joining if component re-renders for other reasons
        return;
    }
    
    console.log(`GamePlayPage: Attempting to confirm/rejoin room ${roomId} for user ${currentUser.userId}`);
    setClientView("loading"); // Set loading state
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
          
          const currentDrawerId = svrRound?.drawerId || null;
          const gamePlayers = gameRoom.players.map((p: any) => mapToGamePlayer(p, svrScores, gameRoom.creatorId, currentDrawerId));
          setRoomState({ ...gameRoom, players: gamePlayers });

          if (gameRoom.status === "playing" && svrRound) {
            setActiveRound({
              ...svrRound,
              timeLeftInRound: svrRound.timeLeftInRound ?? svrRound.totalDrawTimeForRound, // Ensure timeLeft is accurate
              chatAndGuessMessages: svrRound.chatAndGuessMessages || [],
              drawingEvents: svrRound.drawingEvents || [],
            });
            
            const isDrawerNow = svrRound.drawerId === currentUser.userId;
            // setIsMyTurnToDraw(isDrawerNow); // Derived via useMemo

            if (isDrawerNow && svrRound.status === "pending_word_selection") {
              setClientView("word_selection");
              setShowWordSelectionModal(true);
            } else if (isDrawerNow && svrRound.status === "drawing") {
              setClientView("drawing");
            } else if (svrRound.status === "drawing") {
              setClientView("guessing");
            } else if (svrRound.status === "ended_timer" || svrRound.status === "ended_all_guessed" || svrRound.status === "ended_drawer_left"){
              setClientView("round_summary");
            }
             else {
              setClientView("waiting_for_room"); 
            }
          } else if (gameRoom.status === "finished") {
            setClientView("game_summary");
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
      // No setIsLoading(false) here, let clientView change handle it
  }, [roomId, currentUser?.userId, socket, isConnected, emitWithAck, router, mapToGamePlayer, clientView, roomState]); // Added clientView, roomState to prevent re-join attempts

  // Socket Event Handlers
  useEffect(() => {
    if (!socket || !isConnected || !roomId || !currentUser || !vectorClock) return;

    // --- Handler Functions (memoized or defined inside to capture current scope correctly) ---
    // It's crucial these handlers don't cause cascading state updates that lead to loops.
    // They should primarily update state based on new information from the server.

    const handleGameStarted = (data: { roomId: string; startedBy: string; settings: LobbyRoomSettings }) => {
      if (data.roomId !== roomId) return;
      setRoomState((prev) => prev ? { ...prev, status: "playing", settings: data.settings } : null);
      // Client view will be updated by newRoundStarting
    };

    const handleNewRoundStarting = (data: {
      roomId: string; currentRoundNumber: number; totalRounds: number;
      drawer: { userId: string; username: string }; drawTime: number; currentRoundId: string;
    }) => {
      if (data.roomId !== roomId) return;
      setRoomState((prev) => prev ? {
        ...prev,
        currentRoundNumberOverall: data.currentRoundNumber,
        settings: { ...prev.settings, rounds: data.totalRounds },
        players: prev.players.map(p => ({ ...p, isDrawing: p.userId === data.drawer.userId }))
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

      const myTurnNow = data.drawer.userId === currentUser.userId;
      // setIsMyTurnToDraw(myTurnNow); // Derived
      setShowWordSelectionModal(false); // Reset modal state

      if (myTurnNow) {
        setClientView("word_selection"); // Server should then send 'yourTurnToDraw'
      } else {
        setClientView("guessing"); // Other players wait for drawing phase
      }
    };
    
    const handleYourTurnToDraw = (data: { wordChoices: string[] }) => {
        // This event is specifically for the drawer
        setActiveRound((prev) => prev ? { ...prev, wordChoices: data.wordChoices, status: "pending_word_selection" } : null);
        setShowWordSelectionModal(true);
        setClientView("word_selection"); 
    };


    const handleDrawingPhaseStarted = (data: {
      roomId: string; drawerId: string; wordHint: string; drawTime: number; currentRoundId: string;
    }) => {
      if (data.roomId !== roomId || (activeRound && data.currentRoundId !== activeRound.roundId && activeRound.status !== "pending_word_selection") ) return;
      setActiveRound((prev) => prev ? {
        ...prev,
        roundId: data.currentRoundId, // Ensure roundId is updated if it changed
        wordHint: data.wordHint,
        // timeLeftInRound: data.drawTime, // Server should manage time updates via separate event or in activeRound updates
        // totalDrawTimeForRound: data.drawTime,
        status: "drawing",
      } : null);
      setShowWordSelectionModal(false);
      setClientView(data.drawerId === currentUser.userId ? "drawing" : "guessing");
    };
    
    const handleNewDrawingAction = (eventData: DrawingEventFromServer) => {
        if (!activeRound) return;
        
        // No direct drawing on canvas here. GamePlayArea's useEffect will handle it.
        setActiveRound((prev) => {
            if (!prev) return null;
            return { ...prev, drawingEvents: [...prev.drawingEvents, eventData] };
        });
        vectorClock.merge(eventData.vectorTimestamp);
    };

    const handlePlayerGuessed = (data: { /* ... define type ... */ }) => {
      // Similar logic: update activeRound.chatAndGuessMessages and roomState.players scores
      // Guard against processing for wrong room/round
      if (data.roomId !== roomId || !activeRound || (data.roundId && data.roundId !== activeRound.roundId)) return;

        setActiveRound(prev => prev ? { ...prev, chatAndGuessMessages: [...prev.chatAndGuessMessages, { type: "guess", ...data }] } : null);
        
        if (data.isCorrect) {
            setRoomState(prevRoom => {
                if (!prevRoom) return null;
                const newPlayers = prevRoom.players.map(p => {
                    let scoreAddition = 0;
                    if (p.userId === data.userId) scoreAddition = data.pointsAwarded;
                    // Assuming server calculates drawer's points and includes in 'data.scores' or similar for roundOver
                    return { ...p, score: (p.score || 0) + scoreAddition };
                });
                return { ...prevRoom, players: newPlayers };
            });
        }
        vectorClock.merge(data.vectorTimestamp);
    };

    const handleNewChatMessage = (data: { /* ... define type ... */ }) => {
        if (data.roomId !== roomId) return;
        // Allow chat messages even if activeRound is briefly null between rounds, if desired
        if (!activeRound || !data.roundId || data.roundId === activeRound.roundId || !data.roundId) { // Allow general room chat too
            setActiveRound(prev => prev ? { ...prev, chatAndGuessMessages: [...prev.chatAndGuessMessages, { type: "chat", ...data }] } :
                // If activeRound is null, maybe store in a temporary chat queue or handle differently
                null 
            );
            vectorClock.merge(data.vectorTimestamp);
        }
    };
    
    const handleRoundTimerUpdate = (data: { roundId: string; timeLeftInRound: number }) => {
        if (activeRound && data.roundId === activeRound.roundId) {
            setActiveRound(prev => prev ? { ...prev, timeLeftInRound: data.timeLeftInRound } : null);
        }
    };

    const handleRoundOver = (data: {
      roomId: string;
      roundId: string;
      roundNumber: number;
      reason: string;
      word: string;
      scores: Array<{ username: string; score: number }>;
      drawingEvents?: any[];
    }) => {
     
      setActiveRound(prev => {
        if (!prev) return null; // Should not happen if activeRound guard above passed, but good for safety
        return {
          ...prev,
          actualWord: data.word,
          status: ("ended_" + data.reason) as any, // Cast as 'any' or ensure 'ActiveRoundState["status"]' type accommodates this
          drawingEvents: data.drawingEvents || prev.drawingEvents,
          timeLeftInRound: 0,
        };
      });
    
      setRoomState(prevRoom => {
        if (!prevRoom) return null;
  
        const updatedPlayers = prevRoom.players.map(p => {
          const scoreData = data.scores.find(s => s.username === p.username);
          
          return {
            ...p,
            score: scoreData?.score ?? p.score, // Use new score if found, otherwise keep existing
            isDrawing: false // No one is drawing after the round is over
          };
        });
    
        const isGameOver = data.roundNumber >= prevRoom.settings.rounds;
        if (isGameOver) {
          setClientView("game_summary");
        } else {
          setClientView("round_summary");
        }
  
        return { ...prevRoom, players: updatedPlayers };
      });
    };
    

    const handleGameOver = (data: { /* ... define type, including final game scores ... */ }) => {
        if (data.roomId !== roomId) return;
        setRoomState(prevRoom => {
            if (!prevRoom) return null;
            const updatedPlayers = prevRoom.players.map(p => {
                const serverScoreData = data.finalScores.find((s: any) => s.userId === p.userId);
                return { ...p, score: serverScoreData ? serverScoreData.score : p.score, isDrawing: false };
            });
            return { ...prevRoom, players: updatedPlayers, status: "finished" };
        });
        setActiveRound(null); // Clear active round data
        setClientView("game_summary");
        // setIsMyTurnToDraw(false); // Derived
    };

    const handlePlayerLeftMidGame = (data: { /* ... */ }) => {
        if (data.roomId === roomId) {
            setRoomState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    players: prev.players.filter(p => p.userId !== data.userId),
                    playerDrawOrder: data.newPlayerDrawOrder || prev.playerDrawOrder.filter(id => id !== data.userId),
                };
            });
            // If the drawer left, the server should also emit a roundOver or newRoundStarting event.
        };
    };

    // Register socket event listeners
    // socket.on("rejoinedRoom", handleInitialRoomState); // This logic is now in initial useEffect
    socket.on("gameStarted", handleGameStarted);
    socket.on("newRoundStarting", handleNewRoundStarting);
    socket.on("yourTurnToDraw", handleYourTurnToDraw);
    socket.on("drawingPhaseStarted", handleDrawingPhaseStarted);
    socket.on("newDrawingAction", handleNewDrawingAction);
    socket.on("playerGuessed", handlePlayerGuessed);
    socket.on("newChatMessage", handleNewChatMessage);
    socket.on("roundTimerUpdate", handleRoundTimerUpdate); // Assuming server sends timer updates
    socket.on("roundOver", handleRoundOver);
    socket.on("gameOver", handleGameOver);
    socket.on("playerLeftMidGame", handlePlayerLeftMidGame);

    return () => {
      // Clean up socket event listeners
      // socket.off("rejoinedRoom", handleInitialRoomState);
      socket.off("gameStarted", handleGameStarted);
      socket.off("newRoundStarting", handleNewRoundStarting);
      socket.off("yourTurnToDraw", handleYourTurnToDraw);
      socket.off("drawingPhaseStarted", handleDrawingPhaseStarted);
      socket.off("newDrawingAction", handleNewDrawingAction);
      socket.off("playerGuessed", handlePlayerGuessed);
      socket.off("newChatMessage", handleNewChatMessage);
      socket.off("roundTimerUpdate", handleRoundTimerUpdate);
      socket.off("roundOver", handleRoundOver);
      socket.off("gameOver", handleGameOver);
      socket.off("playerLeftMidGame", handlePlayerLeftMidGame);
    };
    // Dependencies: Critical to get these right to avoid stale closures or excessive re-runs.
    // Functions like mapToGamePlayer if defined outside should be memoized with useCallback.
    // currentUser.userId and activeRound.drawerId for isMyTurnToDraw logic.
    // Ensure handlers defined outside have stable references or are included if they use scope that changes.
  }, [socket, isConnected, roomId, currentUser, vectorClock, router, activeRound, clientView, mapToGamePlayer]); // Added activeRound, clientView.
                                                                                                               // mapToGamePlayer if it's stable.


  const onWordSelect = useCallback(async (word: string) => {
    if (!isMyTurnToDraw || !socket || !vectorClock || !activeRound?.roundId || clientView !== "word_selection") {
      console.error("Cannot select word: Conditions not met.", { isMyTurnToDraw, socket, activeRound, clientView });
      return;
    }
    vectorClock.tick(); // Increment local clock

    // Optimistically update UI, server will confirm/send drawingPhaseStarted
    // setActiveRound((prev) => (prev ? { ...prev, actualWord: word, status: "drawing" } : null)); // Let server drive 'status' change
    // setClientView("drawing"); // Let server drive clientView change via drawingPhaseStarted
    setShowWordSelectionModal(false);

    try {
      await emitWithAck("wordSelectedByDrawer", {
        roomId,
        roundId: activeRound.roundId,
        word,
        vectorTimestamp: vectorClock.toObject(),
        clientTimestamp: new Date().toISOString(),
      });
      // Server should respond by starting the drawing phase via 'drawingPhaseStarted' event
    } catch (err) {
      console.error("Error selecting word:", err);
      // Revert optimistic updates or show error
      // setActiveRound((prev) => (prev ? { ...prev, actualWord: null, status: "pending_word_selection" } : null));
      // setClientView("word_selection"); // Stay in word selection
      setShowWordSelectionModal(true); // Re-open modal
      setError(`Could not select word: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [ isMyTurnToDraw, socket, vectorClock, activeRound, roomId, emitWithAck, clientView ]);

  const handleLocalDrawingAction = useCallback((action: DrawingAction) => {
      // This function is called from GamePlayArea when the local user performs a drawing action
      if (!isMyTurnToDraw || !socket || !vectorClock || !activeRound?.roundId || clientView !== "drawing") {
        console.warn("Cannot send drawing action: Conditions not met.");
        return;
      }
      vectorClock.tick();

      // Do NOT add to local activeRound.drawingEvents here.
      // Let the server be the source of truth. Event will be echoed back.
      // This prevents duplicate drawing events if client also processes server echo.

      socket.emit("drawingAction", {
        roomId,
        roundId: activeRound.roundId,
        action, // This is ServerDrawingAction
        vectorTimestamp: vectorClock.toObject(),
        clientTimestamp: new Date().toISOString(),
      });
    }, [isMyTurnToDraw, socket, vectorClock, activeRound, roomId, clientView, currentUser ]
  );

  const handleEmitDrawingAction = useCallback((action: DrawingAction) => {
    vectorClock.tick();
    socket.emit("drawingAction", {
      roomId,
      roundId: activeRound.roundId,
      action, 
      vectorTimestamp: vectorClock.toObject(),
      clientTimestamp: new Date().toISOString(),
    });
  }, [isMyTurnToDraw, socket, vectorClock, activeRound, roomId, clientView, currentUser ]
  );
  
  const onChatMessageSubmit = useCallback(async (message: string, isGuess: boolean) => {
    if (!socket || !vectorClock || !roomState || (!activeRound?.roundId && roomState.status === "playing")) {
      console.warn("Cannot send message/guess: prerequisites not met.");
      return;
    }
    vectorClock.tick();
    const payload = {
      roomId,
      roundId: activeRound?.roundId, // May be undefined for general room chat
      message,
      vectorTimestamp: vectorClock.toObject(),
      clientTimestamp: new Date().toISOString(),
    };
    try {
      if (isGuess && roomState.status === "playing" && activeRound?.roundId && !isMyTurnToDraw) {
        await emitWithAck("submitGuess", { ...payload, guess: message });
      } else if (!isGuess) {
        await emitWithAck("sendChatMessage", payload);
      }
    } catch (err) {
      console.error(`Error sending ${isGuess ? "guess" : "chat"}:`, err);
      setError(`Could not send ${isGuess ? "guess" : "chat"}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [socket, vectorClock, roomState, activeRound, roomId, emitWithAck, isMyTurnToDraw]);

  const handleLeaveGame = useCallback(async () => {
    if (socket && isConnected && currentUser && roomId) {
      try {
        // No need to await if not critical for UI change before navigation
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


  // Render Logic
  if (clientView === "loading" || !currentUser) { // Simplified loading condition
    return <LoadingState roomId={roomId} error={error} />;
  }

  if (clientView === "error_state" || !roomState ) { // If roomState is null after loading and not error, it's an issue
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
      onClose={() => setShowWordSelectionModal(false)} // Allow closing without selection for now
    />
  ) : null;

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-blue-100 to-indigo-100">
      <motion.div
        className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-4 p-2 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <PlayerSidebar
          players={roomState.players}
          currentUserId={currentUser.userId}
          drawerId={activeRound?.drawerId || null} // Ensure drawerId is correctly updated
          roundNumber={activeRound?.currentRoundNumber || roomState.currentRoundNumberOverall || 0}
          totalRounds={roomState.settings.rounds}
          onLeaveGame={handleLeaveGame}
        />

        <GamePlayArea
          clientView={clientView}
          activeRound={activeRound} 
          isMyTurnToDraw={isMyTurnToDraw}
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
          isDrawing={isMyTurnToDraw} // Pass derived value
          isGamePlaying={clientView === "drawing" || clientView === "guessing"}
          currentDrawerId={activeRound?.drawerId || null}
        />
      </motion.div>
      {wordSelectionComponent}
    </main>
  );
}
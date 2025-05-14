"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import DrawingCanvas, { DrawingCanvasRef } from "@/components/game/drawing/drawing-canvas";
import ColorPalette from "@/components/game/drawing/color-palette";
import DrawingTools from "@/components/game/drawing/drawing-tools";
import GameTimer from "@/components/game/game-timer";
import WordDisplay from "@/components/game/word-display";
import {
  DrawingAction,
  DrawingActionType,
  DrawingEvent,
  Round,
  User,
  ClientViewState,
} from "@/types/index";

interface GamePlayAreaProps {
  clientView: ClientViewState;
  activeRound: Round | null;
  isMyTurnToDraw: boolean;
  currentUser: User;
  currentColor: string;
  brushSize: number;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onEmitDrawAction: (action: DrawingAction) => void; // To send actions to server via page.tsx
}

export default function GamePlayArea({
  clientView,
  activeRound,
  isMyTurnToDraw,
  currentUser,
  currentColor,
  timeLeft,
  brushSize,
  onColorChange,
  onBrushSizeChange,
  onEmitDrawAction,
}: GamePlayAreaProps) {
  const [currentDrawingTool, setCurrentDrawingTool] = useState<"brush" | "fill">("brush");
  const drawingCanvasRef = useRef<DrawingCanvasRef>(null);

  const canControlDrawing = isMyTurnToDraw && clientView === "drawing" && activeRound?.status === "drawing";


  // Callback for actions originating from the canvas (lines, fills)
  const handleLocalCanvasAction = useCallback((action: DrawingAction) => {
    // No need to check canControlDrawing here if DrawingCanvas already does it
    // before calling onDrawAction for brush/fill.
    onEmitDrawAction(action);
  }, [onEmitDrawAction]);

  // Handler for the "Clear" action from DrawingTools
  const handleClearAction = useCallback(() => {
    if (!canControlDrawing) return; // Only the current drawer can clear

    // 1. Emit the CLEAR action to the server
    onEmitDrawAction({ type: DrawingActionType.CLEAR });

    // 2. Trigger the immediate local clear on the DrawingCanvas
    drawingCanvasRef.current?.triggerLocalClear();
  }, [canControlDrawing, onEmitDrawAction, drawingCanvasRef]);

  
  
  const getWordText = (word: unknown) => {
    if (typeof word === "string") return word;
    if (typeof word === "object" && word !== null && "text" in word) {
      return (word as any).text;
    }
    return null;
  };

  return (
    <motion.div className="lg:col-span-2 flex flex-col space-y-2 sm:space-y-4 h-full">
      <div className="bg-white rounded-lg shadow p-2 sm:p-4 flex justify-between items-center border border-blue-100">
      <WordDisplay
  word={
    clientView === "drawing" || clientView === "round_summary"
      ? getWordText(activeRound?.wordToGuess)
      : getWordText(activeRound?.wordHint)
  }
  isDrawing={isMyTurnToDraw && clientView === "drawing"}
  isRoundOver={clientView === "round_summary"}
  actualWordAtRoundEnd={getWordText(activeRound?.wordToGuess)}
/>
        <GameTimer
          key={activeRound?.roundId || "timer"}
          timeLeft={timeLeft || 0}
          totalTime={activeRound?.totalDrawTimeForRound || 80}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-1 sm:p-2 flex-1 flex flex-col border border-blue-100 relative">
        <DrawingCanvas
          ref={drawingCanvasRef}
          key={`canvas-${activeRound?.roundId || "static"}`} // Re-mount canvas on round change
          isDrawingAllowed={canControlDrawing}
          currentDrawingColor={currentColor}
          currentBrushSize={brushSize}
          onDrawAction={handleLocalCanvasAction} // For lines and fills from canvas
          drawingEvents={activeRound?.drawingEvents || []}
          currentTool={currentDrawingTool}
          clientView={clientView}
        />
        {canControlDrawing && (
          <div className="mt-2 sm:mt-4 flex flex-col space-y-1 sm:space-y-2">
            <ColorPalette
              selectedColor={currentColor}
              onColorChange={onColorChange}
              canDraw={canControlDrawing} // Pass canDraw to disable if needed
            />
            <div className="flex items-center space-x-1 sm:space-x-2 px-1">
              <span className="text-xs sm:text-sm">Brush:</span>
              <Slider
                className="flex-1"
                value={[brushSize]}
                min={1} max={30} step={1}
                onValueChange={(value) => onBrushSizeChange(value[0])}
                disabled={!canControlDrawing}
              />
              <span className="text-xs sm:text-sm w-5 sm:w-6 text-center">
                {brushSize}
              </span>
            </div>
            <DrawingTools
              onClear={handleClearAction} // Use the updated handler
              onSetTool={setCurrentDrawingTool}
              currentTool={currentDrawingTool}
              canDraw={canControlDrawing} // Pass canDraw to disable if needed
            />
          </div>
        )}

        {/* Overlays for different game states */}
        {clientView === "word_selection" && !isMyTurnToDraw && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-gray-700 text-xl pointer-events-none">
            Waiting for drawer to select a word...
          </div>
        )}
        {clientView === "waiting_for_room" && (
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-gray-700 text-xl pointer-events-none">
              Waiting for next round...
            </div>
        )}
        {clientView === "guessing" && !isMyTurnToDraw && activeRound?.status === "drawing" && (
            <div className="absolute top-2 left-2 p-2 bg-blue-500 text-white text-xs sm:text-sm rounded animate-pulse pointer-events-none">
              {activeRound.drawerUsername || "Player"} is drawing... Guess the word!
            </div>
          )}
        {clientView === "round_summary" && activeRound && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-center p-4 pointer-events-none">
            <h2 className="text-2xl sm:text-3xl font-bold">Round Over!</h2>
            <p className="text-lg sm:text-xl mt-2">
              The word was: <span className="font-bold text-yellow-300">{activeRound.actualWord}</span>
            </p>
            <p className="mt-4 text-sm">Next round starting soon...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
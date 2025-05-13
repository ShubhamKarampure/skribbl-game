// src/components/game/drawing/drawing-tools.tsx
"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trash2, PaintBucket, Pencil } from "lucide-react";
import { DrawingActionType } from "@/types"; // Import the enum

interface DrawingToolsProps {
  onClear: () => void; // Will emit a CLEAR action
  onSetTool: (tool: "brush" | "fill") => void;
  currentTool: "brush" | "fill";
  canDraw: boolean;
}

export default function DrawingTools({
  onClear,
  onSetTool,
  currentTool,
  canDraw,
}: DrawingToolsProps) {
  return (
    <div className="flex justify-center space-x-2 p-1">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={currentTool === "brush" ? "default" : "outline"}
          size="icon"
          onClick={() => onSetTool("brush")}
          title="Brush"
          disabled={!canDraw}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant={currentTool === "fill" ? "default" : "outline"}
          size="icon"
          onClick={() => onSetTool("fill")}
          title="Fill"
          disabled={!canDraw}
        >
          <PaintBucket className="h-4 w-4" />
        </Button>
      </motion.div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="icon"
          onClick={onClear} // This now directly calls the prop which should emit a CLEAR action
          title="Clear Canvas"
          disabled={!canDraw}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}

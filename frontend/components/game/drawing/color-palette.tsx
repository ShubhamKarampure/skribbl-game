// src/components/game/drawing/color-palette.tsx
"use client";

import { motion } from "framer-motion";

interface ColorPaletteProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  canDraw: boolean;
}

export default function ColorPalette({
  selectedColor,
  onColorChange,
  canDraw,
}: ColorPaletteProps) {
  const colors = [
    "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", 
    "#00FFFF", "#FFA500", "#800080", "#A52A2A", "#808080", "#FFFFFF",
  ];

  return (
    <div className="flex flex-wrap justify-center gap-2 p-1">
      {colors.map((color) => (
        <motion.button
          key={color}
          className={`w-8 h-8 rounded-full transition-all
            ${color === "#FFFFFF" ? "border border-gray-400" : ""}
            ${selectedColor === color ? "ring-2 ring-blue-500 ring-offset-2 scale-110" : "hover:scale-110"}
            ${!canDraw ? "opacity-50 cursor-not-allowed" : ""}`}
          style={{ backgroundColor: color }}
          onClick={() => canDraw && onColorChange(color)}
          whileHover={canDraw ? { scale: 1.15 } : {}}
          whileTap={canDraw ? { scale: 0.95 } : {}}
          disabled={!canDraw}
          aria-label={`Select color ${color}`}
        />
      ))}
    </div>
  );
}

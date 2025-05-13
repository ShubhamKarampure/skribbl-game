// Assumption: src/types/drawing.ts (or a similar shared location)
export interface Point {
  x: number;
  y: number;
}

export interface DrawingAction {
  type: "LINE_START" | "LINE_DRAW" | "LINE_END" | "FILL" | "CLEAR" | "UNDO"; 
  points?: Point[];
  color?: string;
  brushSize?: number;
  point?: Point;
  fillColor?: string;
}

export interface DrawingEvent {
  userId: string;
  username: string; // Added for clarity, though not strictly in page.tsx's type
  action: DrawingAction;
  vectorTimestamp: Record<string, number>;
  clientTimestamp?: string;
  roundId?: string; // Added for context
}
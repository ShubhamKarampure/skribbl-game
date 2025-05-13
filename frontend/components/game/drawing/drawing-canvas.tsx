"use client";

import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { motion } from "framer-motion";
import { DrawingAction, DrawingActionType, Point, DrawingEvent } from "@/types"; // Assuming @/types is correct

interface DrawingCanvasProps {
  isDrawingAllowed: boolean;
  currentDrawingColor: string;
  currentBrushSize: number;
  onDrawAction: (action: DrawingAction) => void; // Emits actions to the parent/server
  drawingEvents: DrawingEvent[]; // All events to render, server authoritative
  currentTool: "brush" | "fill";
  clientView?: string; // To control overlay visibility or other view-specific logic
}

export interface DrawingCanvasRef {
  getCanvasDataUrl: () => string | undefined;
  triggerLocalClear: () => void; // Function to be called by parent for immediate local clear
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      isDrawingAllowed,
      currentDrawingColor,
      currentBrushSize,
      onDrawAction,
      drawingEvents,
      currentTool,
      clientView,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isPainting, setIsPainting] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [localDrawingEvents, setLocalDrawingEvents] = useState<DrawingEvent[]>([]);

    const getCanvasContext = (): CanvasRenderingContext2D | null => {
      const canvas = canvasRef.current;
      return canvas ? canvas.getContext("2d", { willReadFrequently: true }) : null;
    };
    
    const redrawCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        // Always start with a white background. This also handles the visual part of CLEAR when it's in eventsToRender.
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Determine which events to render based on whether the user is allowed to draw.
        // If drawing is allowed, local events provide immediate feedback.
        const eventsToRender = isDrawingAllowed 
          ? [...drawingEvents, ...localDrawingEvents]
          : drawingEvents;

        let currentPathPoints: Point[] = [];
        let currentPathColor: string | undefined;
        let currentPathBrushSize: number | undefined;

        eventsToRender.forEach(event => {
            const { action } = event;
            switch (action.type) {
                case DrawingActionType.LINE_START:
                    currentPathPoints = action.points ? [...action.points] : [];
                    currentPathColor = action.color;
                    currentPathBrushSize = action.brushSize;
                    if (currentPathPoints.length === 1 && currentPathColor && currentPathBrushSize) {
                        ctx.beginPath();
                        ctx.arc(currentPathPoints[0].x, currentPathPoints[0].y, currentPathBrushSize / 2, 0, Math.PI * 2);
                        ctx.fillStyle = currentPathColor;
                        ctx.fill();
                    }
                    break;
                case DrawingActionType.LINE_DRAW:
                    if (currentPathPoints.length > 0 && action.points && action.points.length > 0) {
                        const newPoints = action.points;
                        ctx.beginPath();
                        ctx.moveTo(currentPathPoints[currentPathPoints.length - 1].x, currentPathPoints[currentPathPoints.length - 1].y);
                        newPoints.forEach(p => ctx.lineTo(p.x, p.y));
                        ctx.strokeStyle = action.color || currentPathColor || currentDrawingColor;
                        ctx.lineWidth = action.brushSize || currentPathBrushSize || currentBrushSize;
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";
                        ctx.stroke();
                        currentPathPoints.push(...newPoints);
                    }
                    break;
                case DrawingActionType.LINE_END:
                    currentPathPoints = []; // Reset for the next path
                    break;
                case DrawingActionType.FILL:
                    if (action.point && action.color) {
                        performFill(ctx, canvas, Math.floor(action.point.x), Math.floor(action.point.y), action.color);
                    }
                    break;
                case DrawingActionType.CLEAR:
                    // When a CLEAR action is processed from the event stream,
                    // the canvas is cleared here. fillStyle and fillRect are already at the start of redrawCanvas,
                    // but this ensures if CLEAR is mid-stream, subsequent items are on a fresh canvas.
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    currentPathPoints = []; // Reset any ongoing path
                    break;
                case DrawingActionType.UNDO:
                    // UNDO is typically handled by the parent modifying `drawingEvents`.
                    // The canvas just re-renders based on the new (reduced) list of events.
                    break;
            }
        });
    };

    // Effect for canvas setup and resize handling (runs once on mount)
    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = getCanvasContext();
      if (!canvas || !ctx) return;

      const resizeObserver = new ResizeObserver(() => {
        const container = canvas.parentElement;
        if (container) {
            const { width, height } = container.getBoundingClientRect();
            const newHeight = height > 20 ? height - 20 : (height > 0 ? height : 300);
            const newWidth = width > 0 ? width : 500;

            if(canvas.width !== newWidth || canvas.height !== newHeight){
                canvas.width = newWidth;
                canvas.height = newHeight;
                redrawCanvas(ctx, canvas);
            }
        }
      });
      
      const parentElement = canvas.parentElement;
      if (parentElement) {
          resizeObserver.observe(parentElement);
      }
      
      // Initial draw when component mounts
      const container = canvas.parentElement;
      if (container) {
          const { width, height } = container.getBoundingClientRect();
          canvas.width = width > 0 ? width : 500;
          canvas.height = height > 20 ? height - 20 : (height > 0 ? height : 300);
          redrawCanvas(ctx, canvas);
      }

      return () => {
        if (parentElement) {
            resizeObserver.unobserve(parentElement);
        }
      };
    }, []); // Empty dependency array: runs only on mount and unmount.

    // Effect for re-drawing when events, local events, or drawing permission changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = getCanvasContext();
        if (canvas && ctx) {
            // If an authoritative CLEAR action (from server) is present in drawingEvents,
            // ensure localDrawingEvents are cleared to maintain consistency.
            const hasAuthoritativeClear = drawingEvents.some(
              event => event.action.type === DrawingActionType.CLEAR
            );

            if (hasAuthoritativeClear) {
                if (localDrawingEvents.length > 0) {
                    setLocalDrawingEvents([]); // Clear local events if server confirms a clear
                }
            }
            redrawCanvas(ctx, canvas);
        }
    }, [drawingEvents, localDrawingEvents, isDrawingAllowed]); // These dependencies trigger redraw.

    // Effect to clear local events if drawing permission is explicitly revoked
    useEffect(() => {
        if (!isDrawingAllowed) {
            if (localDrawingEvents.length > 0) {
                 setLocalDrawingEvents([]);
            }
        }
    }, [isDrawingAllowed, localDrawingEvents.length]); // Added localDrawingEvents.length to avoid loop if already empty

    // Expose functions to parent component via ref
    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => canvasRef.current?.toDataURL("image/png"),
      triggerLocalClear: () => {
        // 1. Clear the local drawing events state.
        // This will trigger the useEffect above (due to localDrawingEvents changing),
        // which will then call redrawCanvas.
        setLocalDrawingEvents([]);

        // 2. For the most immediate visual feedback, directly clear the canvas context.
        // The subsequent redrawCanvas call (from the effect) will then render
        // server events (drawingEvents) on this already cleared canvas.
        const canvas = canvasRef.current;
        const ctx = getCanvasContext();
        if (canvas && ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        // The parent component is responsible for also calling `onDrawAction({ type: DrawingActionType.CLEAR })`
        // to ensure the server and other clients are notified of the clear action.
      },
    }));

    const getPointerPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ("touches" in e) { // Touch event
        if (e.touches.length === 0) return null; // No touch points
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else { // Mouse event
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const addLocalDrawingEvent = (action: DrawingAction) => {
        const newEvent: DrawingEvent = {
            timestamp: Date.now(),
            userId: "local-user", // This is a placeholder for local events
            action
        };
        setLocalDrawingEvents(prev => [...prev, newEvent]);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawingAllowed || currentTool !== "brush") return;
      const pos = getPointerPosition(e);
      if (!pos) return;

      setIsPainting(true);
      setLastPoint(pos);
      
      const action: DrawingAction = {
        type: DrawingActionType.LINE_START,
        points: [pos],
        color: currentDrawingColor,
        brushSize: currentBrushSize,
      };
      
      addLocalDrawingEvent(action); // Optimistic update for local user
      onDrawAction(action);         // Send to server
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isPainting || !isDrawingAllowed || currentTool !== "brush") return;
      const pos = getPointerPosition(e);
      if (!pos || !lastPoint) return; // lastPoint check ensures we have a start for the line segment

      const action: DrawingAction = {
        type: DrawingActionType.LINE_DRAW,
        points: [pos], // Some implementations send arrays of points for smoother lines with throttling
        color: currentDrawingColor,
        brushSize: currentBrushSize,
      };
      
      addLocalDrawingEvent(action);
      onDrawAction(action);
      
      setLastPoint(pos); // Update the last point for the next segment
    };

    const handleMouseUpOrLeave = () => {
      // Check if we were actually painting. This prevents sending LINE_END if mouse just enters/leaves without drawing.
      if (!isPainting || !isDrawingAllowed || currentTool !== "brush") {
        if(isPainting) setIsPainting(false); // Ensure painting state is reset if conditions not met but was painting
        if(lastPoint) setLastPoint(null);   // Ensure lastPoint is reset
        return;
      }
      
      // Only send LINE_END if painting was true and there was a last point to end from.
      if (lastPoint) { // Ensure lastPoint exists before creating LINE_END
        const action: DrawingAction = {
            type: DrawingActionType.LINE_END,
            points: [lastPoint], // The final point of the line
            color: currentDrawingColor,
            brushSize: currentBrushSize,
        };
        // LINE_END is mostly a server-side or state-management event type.
        // Locally, its visual effect is often implicit by stopping drawing.
        // addLocalDrawingEvent(action); // Optional: if LINE_END has specific local processing
        onDrawAction(action);
      }
      
      setIsPainting(false);
      setLastPoint(null);
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawingAllowed || currentTool !== "fill") return;
        const pos = getPointerPosition(e);
        if (!pos) return;

        const action: DrawingAction = {
            type: DrawingActionType.FILL,
            point: pos,
            color: currentDrawingColor, // Use the current drawing color for the fill
        };
        
        addLocalDrawingEvent(action); // Optimistically apply fill locally
        onDrawAction(action);         // Send fill action to server
    };
    
    const performFill = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, x: number, y: number, fillColorStr: string) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
    
        const targetColor = getColorAtPixel(imageData, x, y);
        const fillRGB = hexToRgb(fillColorStr);
    
        if (!fillRGB || (targetColor.r === fillRGB.r && targetColor.g === fillRGB.g && targetColor.b === fillRGB.b && targetColor.a === 255)) {
            // Don't fill if the target color is the same as the fill color or fill color is invalid
            return;
        }
    
        // Seed pixel for the flood fill algorithm
        const pixelsToCheck: Point[] = [{ x: Math.floor(x), y: Math.floor(y) }];
        // Using a Set to keep track of processed pixels to avoid re-processing and infinite loops
        const processed = new Set<string>(); 
    
        while (pixelsToCheck.length > 0) {
            const pixel = pixelsToCheck.pop(); // Get the last pixel from the stack
            if (!pixel) continue;
    
            const { x: currentX, y: currentY } = pixel;
            const pixelKey = `${currentX}-${currentY}`; // Unique key for the processed set

            // Boundary checks and processed check
            if (currentX < 0 || currentX >= canvasWidth || currentY < 0 || currentY >= canvasHeight || processed.has(pixelKey) ) {
                continue;
            }
            
            const currentColorAtPixel = getColorAtPixel(imageData, currentX, currentY);
    
            // If the current pixel's color matches the target color, fill it and add neighbors to stack
            if (currentColorAtPixel.r === targetColor.r && 
                currentColorAtPixel.g === targetColor.g && 
                currentColorAtPixel.b === targetColor.b && 
                currentColorAtPixel.a === targetColor.a) {
                
                const index = (currentY * canvasWidth + currentX) * 4; // Calculate index in image data array
                data[index] = fillRGB.r;
                data[index + 1] = fillRGB.g;
                data[index + 2] = fillRGB.b;
                data[index + 3] = 255; // Set alpha to fully opaque
                processed.add(pixelKey); // Mark as processed
    
                // Add neighboring pixels to the stack (4-connectivity)
                pixelsToCheck.push({ x: currentX + 1, y: currentY });
                pixelsToCheck.push({ x: currentX - 1, y: currentY });
                pixelsToCheck.push({ x: currentX, y: currentY + 1 });
                pixelsToCheck.push({ x: currentX, y: currentY - 1 });
            }
        }
        ctx.putImageData(imageData, 0, 0); // Apply the modified image data back to the canvas
    };

    const getColorAtPixel = (imageData: ImageData, x: number, y: number): { r: number; g: number; b: number; a: number } => {
        const { width, data, height } = imageData; // Include height for boundary check
        const ix = Math.floor(x);
        const iy = Math.floor(y);

        // Boundary check for pixel coordinates
        if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
            return { r: 0, g: 0, b: 0, a: 0 }; // Default to transparent black if out of bounds
        }
        const index = (iy * width + ix) * 4;
        return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };
    };

    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        // Remove leading '#' if present
        const cleanedHex = hex.startsWith("#") ? hex.slice(1) : hex;

        // Handle shorthand hex (e.g., "03F") -> "0033FF"
        if (cleanedHex.length === 3) {
            const r = cleanedHex[0];
            const g = cleanedHex[1];
            const b = cleanedHex[2];
            const fullHex = `${r}${r}${g}${g}${b}${b}`;
            const result = /([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
            return result ? { 
                r: parseInt(result[1], 16), 
                g: parseInt(result[2], 16), 
                b: parseInt(result[3], 16) 
            } : null;
        }
        
        // Handle full hex (e.g., "0033FF")
        if (cleanedHex.length === 6) {
             const result = /([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanedHex);
             return result ? { 
                r: parseInt(result[1], 16), 
                g: parseInt(result[2], 16), 
                b: parseInt(result[3], 16) 
            } : null;
        }
        return null; // Invalid hex format
    };

    // Determine cursor style based on drawing allowance and current tool
    const cursorStyle = !isDrawingAllowed 
        ? 'cursor-default' 
        : (currentTool === 'brush' || currentTool === 'fill') 
            ? 'cursor-crosshair' 
            : 'cursor-default';

    return (
      <div className="flex-1 relative bg-white border border-gray-200 rounded overflow-hidden">
        <motion.canvas
          ref={canvasRef}
          className={`w-full h-full ${cursorStyle}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onTouchStart={handleMouseDown} 
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUpOrLeave}
          onClick={handleCanvasClick} // Used for the "fill" tool
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        {/* Optional: Overlay to prevent interactions if clientView is 'spectator' or drawing not allowed */}
        { (clientView === 'spectator' || !isDrawingAllowed) && (
            <div className="absolute inset-0 bg-transparent z-10" style={{pointerEvents: 'auto'}}></div>
        )}
      </div>
    );
  }
);

DrawingCanvas.displayName = "DrawingCanvas";
export default DrawingCanvas;
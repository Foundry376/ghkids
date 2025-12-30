import classNames from "classnames";
import React, { useCallback, useEffect, useRef, useState } from "react";
import CreatePixelContext from "./create-pixel-context";
import { getFilledSquares, Point } from "./helpers";
import { PixelTool } from "./tools";
import { PixelContext, PixelImageData } from "./types";

const SELECTION_ANTS_INTERVAL = 200;

function getEdgePixels(
  pixelMap: Record<string, boolean>
): [number, number, boolean | undefined, boolean | undefined, boolean | undefined, boolean | undefined][] {
  const results: [number, number, boolean | undefined, boolean | undefined, boolean | undefined, boolean | undefined][] = [];
  for (const p of Object.keys(pixelMap)) {
    const [x, y] = p.split(",").map(Number);
    const left = pixelMap[`${x - 1},${y}`];
    const right = pixelMap[`${x + 1},${y}`];
    const top = pixelMap[`${x},${y - 1}`];
    const bot = pixelMap[`${x},${y + 1}`];
    if (!left || !right || !top || !bot) {
      results.push([x, y, left, right, top, bot]);
    }
  }
  return results;
}

export interface PixelCanvasProps {
  tool: PixelTool | null;
  color: string;
  pixelSize: number;
  anchorSquare: Point;
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
  interactionPixels: Record<string, boolean> | null;
  onMouseDown: (event: React.MouseEvent, pixel: Point) => void;
  onMouseMove: (event: MouseEvent | React.MouseEvent, pixel: Point) => void;
  onMouseUp: (event: MouseEvent | React.MouseEvent, pixel: Point) => void;
}

const PixelCanvas: React.FC<PixelCanvasProps> = ({
  tool,
  pixelSize,
  anchorSquare,
  imageData,
  selectionImageData,
  selectionOffset,
  interactionPixels,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}) => {
  const [mousedown, setMousedown] = useState(false);
  const [mouseoverSelection, setMouseoverSelection] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelContextRef = useRef<PixelContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getSelectionPixels = useCallback((): Record<string, boolean> => {
    if (interactionPixels) {
      return interactionPixels;
    }

    if (selectionImageData) {
      return selectionImageData.getOpaquePixels();
    }

    return {};
  }, [interactionPixels, selectionImageData]);

  const pixelForEvent = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }): Point => {
      if (!canvasRef.current) {
        return { x: 0, y: 0 };
      }
      const { top, left } = canvasRef.current.getBoundingClientRect();
      return {
        x: Math.round((clientX - left + pixelSize / 2) / pixelSize),
        y: Math.round((clientY - top + pixelSize / 2) / pixelSize),
      };
    },
    [pixelSize]
  );

  const renderToCanvas = useCallback(() => {
    const c = pixelContextRef.current;
    if (!c || !canvasRef.current) return;

    c.fillStyle = "rgb(255,255,255)";
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);

    if (pixelSize > 3) {
      c.drawTransparentPattern();
    }
    if (imageData) {
      c.applyPixelsFromData(imageData, 0, 0, imageData.width, imageData.height, 0, 0, {
        ignoreClearPixels: true,
      });
    }

    if (selectionImageData) {
      c.applyPixelsFromData(
        selectionImageData,
        0,
        0,
        selectionImageData.width,
        selectionImageData.height,
        selectionOffset.x,
        selectionOffset.y,
        {
          ignoreClearPixels: true,
        }
      );
    }

    if (imageData && (imageData.width > 40 || imageData.height > 40)) {
      const anchor = anchorSquare || { x: 0, y: 0 };
      const filled = getFilledSquares(imageData);

      c.fillStyle = "rgba(100,100,100,0.15)";
      for (let x = 0; x < imageData.width; x += 40) {
        for (let y = 0; y < imageData.height; y += 40) {
          const isAnchorSquare = anchor.x * 40 === x && anchor.y * 40 === y;
          c.lineWidth = isAnchorSquare ? 2 : 1;
          c.strokeStyle = isAnchorSquare ? "rgba(255,70,70,1)" : "rgba(100,100,100,0.25)";
          c.strokeRect(
            x * pixelSize + 0.5,
            y * pixelSize + 0.5,
            40 * pixelSize - 1,
            40 * pixelSize - 1
          );

          if (!filled[`${x / 40},${y / 40}`]) {
            c.fillRect(x * pixelSize + 0.5, y * pixelSize + 0.5, 40 * pixelSize, 40 * pixelSize);
          }
        }
      }
    }
    if (tool && tool.render) {
      tool.render(c as any, {
        color: "",
        toolSize: 1,
        pixelSize,
        anchorSquare,
        imageData,
        selectionImageData,
        selectionOffset,
        interaction: { s: null, e: null, points: [] },
        interactionPixels,
      }, true);
    }

    const selectionPixels = getSelectionPixels();
    const edgePixels = getEdgePixels(selectionPixels);

    if (edgePixels.length && imageData) {
      c.beginPath();
      for (const [x, y, left, right, top, bot] of edgePixels) {
        if (
          (Math.floor(Date.now() / SELECTION_ANTS_INTERVAL) + x + y * (imageData.width + 1)) % 2 ===
          0
        ) {
          const topY = (y + selectionOffset.y) * pixelSize + 0.5;
          const botY = (y + 1 + selectionOffset.y) * pixelSize + 0.5;
          const leftX = (x + selectionOffset.x) * pixelSize + 0.5;
          const rightX = (x + 1 + selectionOffset.x) * pixelSize + 0.5;
          if (!left) {
            c.moveTo(leftX, topY);
            c.lineTo(leftX, botY);
          }
          if (!right) {
            c.moveTo(rightX, topY);
            c.lineTo(rightX, botY);
          }
          if (!top) {
            c.moveTo(leftX, topY);
            c.lineTo(rightX, topY);
          }
          if (!bot) {
            c.moveTo(leftX, botY);
            c.lineTo(rightX, botY);
          }
        }
      }
      c.lineWidth = 2.4;
      c.strokeStyle = "rgba(255,255,255,1)";
      c.lineCap = "round";
      c.stroke();
      c.lineWidth = 1;
      c.strokeStyle = "rgba(0,0,0,1)";
      c.stroke();
    }

    if (pixelSize > 5) {
      c.drawGrid();
    }
  }, [
    pixelSize,
    imageData,
    selectionImageData,
    selectionOffset,
    anchorSquare,
    tool,
    interactionPixels,
    getSelectionPixels,
  ]);

  // Initialize canvas context
  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d") as PixelContext;
    CreatePixelContext.call(ctx, pixelSize);
    pixelContextRef.current = ctx;

    renderToCanvas();
  }, []);

  // Update context when pixel size changes
  useEffect(() => {
    if (!canvasRef.current || !pixelContextRef.current) return;

    if (pixelContextRef.current.getPixelSize() !== pixelSize) {
      const ctx = canvasRef.current.getContext("2d") as PixelContext;
      CreatePixelContext.call(ctx, pixelSize);
      pixelContextRef.current = ctx;
    }

    // Handle selection animation timer
    const selectionPresent = Object.keys(getSelectionPixels()).length;

    if (selectionPresent && !timerRef.current) {
      timerRef.current = setInterval(() => renderToCanvas(), SELECTION_ANTS_INTERVAL);
    } else if (!selectionPresent && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    renderToCanvas();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pixelSize, getSelectionPixels, renderToCanvas]);

  // Mouse move handler (attached to canvas when not dragging)
  const handleMouseMoveOnCanvas = useCallback(
    (event: MouseEvent) => {
      const p = pixelForEvent(event);

      if (mousedown) {
        onMouseMove(event, p);
      }

      const selectionPixels = getSelectionPixels();
      const isOverSelection =
        selectionPixels[`${p.x - selectionOffset.x},${p.y - selectionOffset.y}`];
      if (isOverSelection !== mouseoverSelection) {
        setMouseoverSelection(!!isOverSelection);
      }
    },
    [mousedown, onMouseMove, pixelForEvent, getSelectionPixels, selectionOffset, mouseoverSelection]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!canvasRef.current) return;

      canvasRef.current.removeEventListener("mousemove", handleMouseMoveOnCanvas);
      document.addEventListener("mousemove", handleMouseMoveOnCanvas);
      document.addEventListener("mouseup", handleMouseUp);

      onMouseDown(event, pixelForEvent(event));
      setMousedown(true);
    },
    [onMouseDown, pixelForEvent, handleMouseMoveOnCanvas]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!canvasRef.current) return;

      canvasRef.current.addEventListener("mousemove", handleMouseMoveOnCanvas);
      document.removeEventListener("mousemove", handleMouseMoveOnCanvas);
      document.removeEventListener("mouseup", handleMouseUp);

      if (mousedown) {
        onMouseUp(event, pixelForEvent(event));
        setMousedown(false);
      }
    },
    [mousedown, onMouseUp, pixelForEvent, handleMouseMoveOnCanvas]
  );

  // Set up initial mousemove listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousemove", handleMouseMoveOnCanvas);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMoveOnCanvas);
      document.removeEventListener("mousemove", handleMouseMoveOnCanvas);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMoveOnCanvas, handleMouseUp]);

  const { width, height } = imageData || { width: 1, height: 1 };

  return (
    <div
      style={{ width: 455, height: 455, overflow: "scroll", lineHeight: 0, background: "#ccc" }}
    >
      <div
        style={{
          minHeight: "100%",
          minWidth: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "fit-content",
          height: "fit-content",
        }}
      >
        <canvas
          style={{ backgroundColor: "white" }}
          width={width * pixelSize}
          height={height * pixelSize}
          className={classNames({
            mousedown: mousedown,
            mouseoverSelection: mouseoverSelection,
          })}
          onMouseDown={handleMouseDown}
          ref={canvasRef}
        />
      </div>
    </div>
  );
};

export default PixelCanvas;

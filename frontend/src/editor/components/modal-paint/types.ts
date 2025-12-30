import { Point } from "./helpers";
import type { PixelTool } from "./tools";

/**
 * Extended ImageData with pixel manipulation methods.
 * Created by calling CreatePixelImageData on a regular ImageData.
 */
export interface PixelImageData extends ImageData {
  clone(): PixelImageData;
  log(): void;
  maskUsingPixels(mask: Record<string, boolean>): void;
  applyPixelsFromData(
    imageData: ImageData,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    offsetX: number,
    offsetY: number,
    options?: { ignoreClearPixels?: boolean }
  ): void;
  fillPixel(x: number, y: number): void;
  fillToolSize(x: number, y: number, size: number): void;
  fillPixelRGBA(x: number, y: number, r: number, g: number, b: number, a: number): void;
  getPixel(x: number, y: number): [number, number, number, number];
  clearPixelsInRect(startX: number, startY: number, endX: number, endY: number): void;
  getContiguousPixels(
    startPixel: Point,
    callback?: (p: Point) => void
  ): Record<string, boolean>;
  getOpaquePixels(): Record<string, boolean>;
  fillStyle: string;
  _fillStyle: string | null;
  _fillStyleComponents: (string | number)[];
}

/**
 * Extended CanvasRenderingContext2D with pixel manipulation methods.
 * Created by calling CreatePixelContext on a regular context.
 */
export interface PixelContext extends CanvasRenderingContext2D {
  applyPixelsFromData(
    imageData: ImageData,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    offsetX: number,
    offsetY: number,
    options?: { ignoreClearPixels?: boolean }
  ): void;
  fillPixel(x: number, y: number): void;
  fillToolSize(x: number, y: number, size: number): void;
  clearPixel(x: number, y: number): void;
  getPixelExtent(): { xMax: number; yMax: number };
  getPixelSize(): number;
  drawTransparentPattern(): void;
  drawGrid(): void;
  _cachedTransparentPattern: HTMLCanvasElement | null;
}

/**
 * Interaction state during tool usage
 */
export interface PixelInteraction {
  s: Point | null;
  e: Point | null;
  points: Point[];
}

/**
 * State shape that tools work with.
 * This is the subset of PaintState that tools need access to.
 */
export interface PixelToolState {
  color: string;
  toolSize: number;
  pixelSize: number;
  anchorSquare: Point;
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
  interaction: PixelInteraction;
  interactionPixels: Record<string, boolean> | null;
  initialSelectionOffset?: Point;
  draggingSelection?: boolean;
}

/**
 * Checkpoint for undo/redo stack
 */
export interface PaintCheckpoint {
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
}

/**
 * Full state managed by the paint container.
 * Extends PixelToolState so tools can work with this state directly.
 */
export interface PaintState extends PixelToolState {
  tool: PixelTool;
  undoStack: PaintCheckpoint[];
  redoStack: PaintCheckpoint[];
  showVariables: boolean;
  visibleVariables: Record<string, boolean>;
  isGeneratingSprite: boolean;
  spriteDescription: string;
  dropdownOpen: boolean;
  spriteName: string;
}

/**
 * Helper function to extract tool-compatible state from PaintState
 */
export function getToolState(state: PaintState): PixelToolState {
  return {
    color: state.color,
    toolSize: state.toolSize,
    pixelSize: state.pixelSize,
    anchorSquare: state.anchorSquare,
    imageData: state.imageData,
    selectionImageData: state.selectionImageData,
    selectionOffset: state.selectionOffset,
    interaction: state.interaction,
    interactionPixels: state.interactionPixels,
    initialSelectionOffset: state.initialSelectionOffset,
    draggingSelection: state.draggingSelection,
  };
}

/**
 * Helper function to create a checkpoint from state
 */
export function createCheckpoint(state: PaintState): PaintCheckpoint {
  return {
    imageData: state.imageData,
    selectionImageData: state.selectionImageData,
    selectionOffset: state.selectionOffset,
  };
}

/**
 * Variable overlay configuration stored in appearanceInfo
 */
export interface VariableOverlayConfig {
  showVariables: boolean;
  visibleVariables: Record<string, boolean>;
}

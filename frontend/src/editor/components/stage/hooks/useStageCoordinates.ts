import { useCallback } from "react";
import { Position } from "../../../../types";
import { STAGE_CELL_SIZE } from "../../../constants/constants";

/**
 * Pixel offset from stage origin.
 * `left` is pixels from left edge, `top` is pixels from top edge.
 */
export interface PxOffset {
  left: number;
  top: number;
}

/**
 * Calculates the pixel offset of an event relative to the stage element.
 *
 * This is a pure function extracted for testability.
 *
 * @param clientX - Event's clientX coordinate
 * @param clientY - Event's clientY coordinate
 * @param stageRect - Bounding client rect of the stage element
 * @returns Pixel offset from stage origin
 */
export function calculatePxOffset(
  clientX: number,
  clientY: number,
  stageRect: DOMRect
): PxOffset {
  return {
    left: clientX - stageRect.left,
    top: clientY - stageRect.top,
  };
}

/**
 * Converts a pixel offset to a grid position, accounting for drag offset and scale.
 *
 * This is a pure function extracted for testability.
 *
 * The drag offset is the position within the dragged item where the user grabbed it.
 * When no drag offset is provided, we use half a cell size to effectively floor
 * instead of round (centering the position calculation).
 *
 * @param pxOffset - Pixel offset from stage origin
 * @param scale - Current zoom scale of the stage
 * @param dragOffset - Optional offset from drag data (where user grabbed the item)
 * @returns Grid position {x, y}
 */
export function calculateGridPosition(
  pxOffset: PxOffset,
  scale: number,
  dragOffset?: { dragLeft: number; dragTop: number }
): Position {
  // When no drag offset is provided, use half cell size.
  // This is a way of doing Math.floor instead of Math.round,
  // because Math.round(x - 0.5) ≈ Math.floor(x) for positive x
  const { dragLeft, dragTop } = dragOffset ?? {
    dragLeft: STAGE_CELL_SIZE / 2,
    dragTop: STAGE_CELL_SIZE / 2,
  };

  return {
    x: Math.round((pxOffset.left - dragLeft) / STAGE_CELL_SIZE / scale),
    y: Math.round((pxOffset.top - dragTop) / STAGE_CELL_SIZE / scale),
  };
}

/**
 * Parses drag offset from a dataTransfer object.
 *
 * @param dataTransfer - The DataTransfer object from a drag event
 * @returns Parsed drag offset, or undefined if not present
 */
export function parseDragOffset(
  dataTransfer: DataTransfer | null
): { dragLeft: number; dragTop: number } | undefined {
  if (!dataTransfer) return undefined;

  const dragOffsetStr = dataTransfer.getData("drag-offset");
  if (!dragOffsetStr) return undefined;

  try {
    return JSON.parse(dragOffsetStr);
  } catch {
    return undefined;
  }
}

/**
 * Checks if a position is within the stage bounds.
 *
 * @param position - Grid position to check
 * @param stageWidth - Width of stage in cells
 * @param stageHeight - Height of stage in cells
 * @returns True if position is within bounds
 */
export function isPositionInBounds(
  position: Position,
  stageWidth: number,
  stageHeight: number
): boolean {
  return (
    position.x >= 0 &&
    position.x < stageWidth &&
    position.y >= 0 &&
    position.y < stageHeight
  );
}

/**
 * Hook that provides coordinate transformation utilities for the Stage component.
 *
 * This hook provides callbacks that transform between:
 * - Client coordinates (from mouse/touch events)
 * - Pixel offsets (relative to stage element)
 * - Grid positions (game coordinates)
 *
 * ## Closure Semantics
 *
 * - `stageElRef.current` is read at call time (always gets latest DOM element)
 * - `scale` is captured in the closure when useCallback dependencies change
 *
 * Since this hook is called on every render with the current `scale` value,
 * and React recreates callbacks when dependencies change, the callbacks
 * always have access to the correct scale. This matches React's standard
 * callback patterns.
 *
 * @param stageElRef - Ref to the stage DOM element
 * @param scale - Current zoom scale of the stage
 * @returns Object with coordinate transformation functions
 */
export function useStageCoordinates(
  stageElRef: React.RefObject<HTMLDivElement>,
  scale: number
) {
  /**
   * Gets the pixel offset of a mouse/drag event relative to the stage.
   *
   * IMPORTANT: This reads from stageElRef.current at call time, not hook execution time.
   * The caller must ensure the stage element exists when this is called.
   */
  const getPxOffsetForEvent = useCallback(
    (event: MouseEvent | React.MouseEvent | React.DragEvent): PxOffset => {
      const stageRect = stageElRef.current!.getBoundingClientRect();
      return calculatePxOffset(event.clientX, event.clientY, stageRect);
    },
    [stageElRef]
  );

  /**
   * Converts a mouse/drag event to a grid position.
   *
   * For drag events, this will parse and apply the drag offset from dataTransfer.
   * For regular mouse events, it centers the position calculation.
   *
   * IMPORTANT: Uses `scale` captured at hook execution. Since this hook is called
   * on every render, scale will always be current.
   */
  const getPositionForEvent = useCallback(
    (event: MouseEvent | React.MouseEvent | React.DragEvent): Position => {
      const pxOffset = getPxOffsetForEvent(event);

      // Extract drag offset from dataTransfer if this is a drag event
      const dragOffset =
        "dataTransfer" in event
          ? parseDragOffset(event.dataTransfer)
          : undefined;

      return calculateGridPosition(pxOffset, scale, dragOffset);
    },
    [getPxOffsetForEvent, scale]
  );

  /**
   * Checks if a position is within the stage bounds.
   *
   * IMPORTANT: This function does NOT access refs or mutable state.
   * It's a pure function wrapped in useCallback for reference stability.
   */
  const isInBounds = useCallback(
    (position: Position, stageWidth: number, stageHeight: number): boolean => {
      return isPositionInBounds(position, stageWidth, stageHeight);
    },
    []
  );

  return {
    getPxOffsetForEvent,
    getPositionForEvent,
    isInBounds,
  };
}

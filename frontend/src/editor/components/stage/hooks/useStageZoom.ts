import { useEffect, useState } from "react";
import { STAGE_CELL_SIZE } from "../../../constants/constants";

/**
 * Available zoom steps for the stage.
 * These are the discrete scale values that users can cycle through.
 */
export const STAGE_ZOOM_STEPS = [1, 0.88, 0.75, 0.63, 0.5, 0.42, 0.38];

/**
 * Calculates the best zoom scale to fit the stage within a container.
 *
 * This is a pure function extracted for testability.
 *
 * @param containerWidth - Width of the container in pixels
 * @param containerHeight - Height of the container in pixels
 * @param stageWidth - Width of the stage in cells
 * @param stageHeight - Height of the stage in cells
 * @param zoomSteps - Available zoom steps (defaults to STAGE_ZOOM_STEPS)
 * @returns The best zoom scale that fits the stage within the container
 */
export function calculateFitScale(
  containerWidth: number,
  containerHeight: number,
  stageWidth: number,
  stageHeight: number,
  zoomSteps: number[] = STAGE_ZOOM_STEPS
): number {
  const fit = Math.min(
    containerWidth / (stageWidth * STAGE_CELL_SIZE),
    containerHeight / (stageHeight * STAGE_CELL_SIZE)
  );
  // Find the largest zoom step that's <= the calculated fit
  return zoomSteps.find((z) => z <= fit) ?? fit;
}

export interface StageScaleConfig {
  width: number;
  height: number;
  scale?: number | "fit";
}

/**
 * Hook that manages the zoom/scale state for the Stage component.
 *
 * This hook handles:
 * - Initial scale based on stage.scale prop
 * - "fit" mode which automatically calculates best scale for container
 * - Window resize handling to recalculate fit scale
 * - Recording mode which forces scale to 1
 *
 * CAPTURE SEMANTICS:
 * - `scrollElRef` and `stageElRef` are refs - stable across renders
 * - `stage` object properties are captured in the useEffect dependency array
 * - `recordingCentered` affects whether we use fit mode
 *
 * SIDE EFFECTS:
 * - Sets stageEl.style.zoom directly (for "fit" mode)
 * - Adds/removes window resize listener
 *
 * @param scrollElRef - Ref to the scrollable container element
 * @param stageElRef - Ref to the stage element (where zoom is applied)
 * @param stage - Stage configuration with width, height, and scale
 * @param recordingCentered - If true, forces scale to 1 (recording preview mode)
 * @returns Current scale value
 */
export function useStageZoom(
  scrollElRef: React.RefObject<HTMLDivElement>,
  stageElRef: React.RefObject<HTMLDivElement>,
  stage: StageScaleConfig,
  recordingCentered?: boolean
): number {
  const [scale, setScale] = useState(() => {
    // Initial scale from props, or 1 as default
    if (stage.scale && typeof stage.scale === "number") {
      return stage.scale;
    }
    return 1;
  });

  useEffect(() => {
    const autofit = () => {
      const scrollEl = scrollElRef.current;
      const stageEl = stageElRef.current;
      if (!scrollEl || !stageEl) return;

      if (recordingCentered) {
        // Recording mode: always use scale 1
        setScale(1);
      } else if (stage.scale === "fit") {
        // Fit mode: calculate best scale for container
        // First reset zoom to get accurate container dimensions
        stageEl.style.zoom = "1";
        const best = calculateFitScale(
          scrollEl.clientWidth,
          scrollEl.clientHeight,
          stage.width,
          stage.height
        );
        // Apply zoom directly to element (this is the existing behavior)
        stageEl.style.zoom = `${best}`;
        setScale(best);
      } else {
        // Explicit scale value
        setScale(stage.scale ?? 1);
      }
    };

    window.addEventListener("resize", autofit);
    autofit();

    return () => window.removeEventListener("resize", autofit);
  }, [
    scrollElRef,
    stageElRef,
    stage.height,
    stage.scale,
    stage.width,
    recordingCentered,
  ]);

  return scale;
}

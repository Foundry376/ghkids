import { useCallback, useState } from "react";
import { Actor } from "../../../../types";

/**
 * State for the actor selection popover.
 *
 * The popover appears when clicking on overlapping actors, allowing
 * the user to choose which actor to interact with.
 */
export interface PopoverState {
  /** The overlapping actors to choose from */
  actors: Actor[];
  /** Screen position where popover should appear */
  position: { x: number; y: number };
  /** Which tool triggered this popover (affects what happens on selection) */
  toolId: string;
}

/**
 * Hook that manages the actor selection popover state.
 *
 * The popover appears when:
 * - Clicking on a position with multiple overlapping actors
 * - Using tools that need to target a specific actor (paint, stamp, trash, etc.)
 *
 * IMPORTANT: This hook manages state only. The parent component is responsible for:
 * - Detecting when to show the popover (overlapping actors)
 * - Handling the selected actor (dispatching appropriate action)
 * - Rendering the actual popover UI
 *
 * @returns Object with popover state and control functions
 */
export function useStagePopover() {
  const [popover, setPopover] = useState<PopoverState | null>(null);

  /**
   * Shows the popover with the given actors at the specified position.
   *
   * @param actors - Array of overlapping actors to choose from
   * @param position - Screen position (clientX/clientY) where popover should appear
   * @param toolId - The tool that triggered this popover
   */
  const showPopover = useCallback(
    (
      actors: Actor[],
      position: { x: number; y: number },
      toolId: string
    ) => {
      setPopover({ actors, position, toolId });
    },
    []
  );

  /**
   * Closes the popover without making a selection.
   */
  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  /**
   * Whether the popover is currently visible.
   */
  const isOpen = popover !== null;

  return {
    popover,
    isOpen,
    showPopover,
    closePopover,
  };
}

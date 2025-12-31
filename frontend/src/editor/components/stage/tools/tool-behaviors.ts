/**
 * Tool Behavior Strategy Pattern
 *
 * This module defines the behavior of each tool in a declarative way.
 * Instead of scattered switch statements throughout stage.tsx, each tool's
 * behavior is defined in one place.
 *
 * This makes it easier to:
 * - Understand what each tool does
 * - Add new tools
 * - Test tool behavior in isolation
 * - Modify tool behavior without hunting through event handlers
 */

import {
  Actor,
  Characters,
  Position,
  RuleExtent,
  Stage,
  UIState,
  WorldMinimal,
} from "../../../../types";
import {
  deleteActors,
  recordClickForGameState,
} from "../../../actions/stage-actions";
import {
  paintCharacterAppearance,
  select,
  selectToolId,
  selectToolItem,
} from "../../../actions/ui-actions";
import {
  setupRecordingForActor,
  toggleSquareIgnored,
  upsertRecordingCondition,
} from "../../../actions/recording-actions";
import { TOOLS } from "../../../constants/constants";
import { actorsAtPoint } from "../../../utils/stage-helpers";
import { makeId } from "../../../utils/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispatch = (action: any) => void;

/**
 * Context passed to tool behavior handlers.
 *
 * This provides access to all the state and functions needed to implement
 * tool behaviors without the handler needing to know about React hooks.
 */
export interface ToolContext {
  // Redux dispatch
  dispatch: Dispatch;

  // World/stage data
  stage: Stage;
  world: WorldMinimal;
  characters: Characters;
  recordingExtent?: RuleExtent;

  // Current selection
  selected: Actor[];
  /** Creates a selection object for the given actor IDs */
  selFor: (actorIds: string[]) => {
    worldId: string;
    stageId: string;
    actorIds: string[];
  };

  // UI state
  stampToolItem: UIState["stampToolItem"];
  playback: UIState["playback"];

  // Popover control
  /** Shows the actor selection popover */
  showPopover: (
    actors: Actor[],
    clientPosition: { x: number; y: number }
  ) => void;
  /** Whether the popover is currently open */
  isPopoverOpen: boolean;
}

/**
 * Defines the behavior of a tool.
 */
export interface ToolBehavior {
  /**
   * Called when the user clicks (mouse up) on an actor.
   *
   * Return true if the click was handled, false to let it propagate.
   *
   * NOTE: This is NOT called during drag operations. For drag behavior,
   * use onDragPosition.
   *
   * @param actor - The actor that was clicked
   * @param event - The mouse event
   * @param ctx - Tool context with dispatch, state, etc.
   * @returns true if the event was handled
   */
  onActorClick?: (
    actor: Actor,
    event: React.MouseEvent,
    ctx: ToolContext
  ) => boolean;

  /**
   * Called when the user drags across a grid position.
   *
   * This is called once per position during a drag operation.
   * The `isFirstPosition` flag indicates if this is the initial click position.
   *
   * @param position - The grid position
   * @param isFirstPosition - True if this is the first position in the drag
   * @param event - The mouse event
   * @param ctx - Tool context
   */
  onDragPosition?: (
    position: Position,
    isFirstPosition: boolean,
    event: MouseEvent,
    ctx: ToolContext
  ) => void;

  /**
   * If true, shows the actor selection popover when clicking on
   * overlapping actors. The selected actor is passed to onActorClick.
   */
  showPopoverOnOverlap?: boolean;

  /**
   * If true, the tool resets to POINTER after use (unless shift is held).
   */
  resetAfterUse?: boolean;
}

/**
 * Tool behaviors for each tool type.
 *
 * IMPORTANT: These behaviors must EXACTLY match the original behavior in stage.tsx.
 * Any deviation could cause subtle bugs that are hard to track down.
 */
export const TOOL_BEHAVIORS: Partial<Record<TOOLS, ToolBehavior>> = {
  /**
   * POINTER: Select actors, or record clicks during playback.
   *
   * Original behavior:
   * - During playback: recordClickForGameState
   * - With shift: toggle actor in multi-selection
   * - Without shift: select single actor
   * - Shows popover on overlap
   */
  [TOOLS.POINTER]: {
    showPopoverOnOverlap: true,
    onActorClick: (actor, event, ctx) => {
      if (ctx.playback.running) {
        ctx.dispatch(recordClickForGameState(ctx.world.id, actor.id));
        return true;
      }

      if (event.shiftKey) {
        // Toggle in selection
        const selectedIds = ctx.selected.map((a) => a.id);
        const newIds = selectedIds.includes(actor.id)
          ? selectedIds.filter((id) => id !== actor.id)
          : [...selectedIds, actor.id];
        ctx.dispatch(select(actor.characterId, ctx.selFor(newIds)));
      } else {
        // Single select
        ctx.dispatch(select(actor.characterId, ctx.selFor([actor.id])));
      }
      return true;
    },
  },

  /**
   * PAINT: Copy an actor's appearance to the paint brush.
   *
   * Original behavior:
   * - Click actor: set paint brush to that appearance
   * - Shows popover on overlap
   * - Resets to POINTER after use
   */
  [TOOLS.PAINT]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(
        paintCharacterAppearance(actor.characterId, actor.appearance)
      );
      return true;
    },
  },

  /**
   * STAMP: Copy actors (like a rubber stamp).
   *
   * Original behavior:
   * - If no stampToolItem: click to set stamp source
   * - If stampToolItem exists: drag to stamp copies (handled elsewhere)
   * - Shows popover on overlap when selecting source
   * - Resets to POINTER after use
   *
   * NOTE: The actual stamping (copying actors) is handled by the drag/drop
   * system, not here. This only handles setting the stamp source.
   */
  [TOOLS.STAMP]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      // Only handle if we don't have a stamp item yet (selecting source)
      if (!ctx.stampToolItem) {
        ctx.dispatch(selectToolItem(ctx.selFor([actor.id])));
        return true;
      }
      // If stamp item exists, don't handle - let drag system take over
      return false;
    },
    onDragPosition: (position, _isFirst, _event, ctx) => {
      // Stamping during drag - handled by separate stamp logic
      // This is a placeholder - actual implementation requires access to
      // the drop functions which are in stage.tsx
    },
  },

  /**
   * TRASH: Delete actors.
   *
   * Original behavior:
   * - First click with overlap: show popover
   * - Click/drag: delete topmost actor
   * - If clicked actor is selected: delete all selected
   * - Skip if popover is open
   * - Resets to POINTER after use
   */
  [TOOLS.TRASH]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      // Delete the actor (or all selected if clicked actor is selected)
      const selectedIds = ctx.selected.map((a) => a.id);
      if (selectedIds.includes(actor.id)) {
        ctx.dispatch(deleteActors(ctx.selFor(selectedIds)));
      } else {
        ctx.dispatch(deleteActors(ctx.selFor([actor.id])));
      }
      return true;
    },
    onDragPosition: (position, isFirstPosition, event, ctx) => {
      // Skip if popover is open
      if (ctx.isPopoverOpen) return;

      const overlapping = actorsAtPoint(
        ctx.stage.actors,
        ctx.characters,
        position
      );

      // On first position with overlap, show popover instead
      if (isFirstPosition && overlapping.length > 1) {
        ctx.showPopover(overlapping, { x: event.clientX, y: event.clientY });
        return;
      }

      // Delete the topmost actor
      const actor = overlapping[overlapping.length - 1];
      if (!actor) return;

      // If clicked actor is in selection, delete all selected
      const selectedIds = ctx.selected.map((a) => a.id);
      if (selectedIds.includes(actor.id)) {
        ctx.dispatch(deleteActors(ctx.selFor(selectedIds)));
      } else {
        ctx.dispatch(deleteActors(ctx.selFor([actor.id])));
      }
    },
  },

  /**
   * RECORD: Start recording a rule for an actor.
   *
   * Original behavior:
   * - Click actor: start recording for that actor's character
   * - Shows popover on overlap
   * - Resets to POINTER after use
   */
  [TOOLS.RECORD]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(
        setupRecordingForActor({ characterId: actor.characterId, actor })
      );
      ctx.dispatch(selectToolId(TOOLS.POINTER));
      return true;
    },
  },

  /**
   * ADD_CLICK_CONDITION: Add a "when clicked" condition for an actor.
   *
   * Original behavior:
   * - Click actor: add condition "click = actorId"
   * - Shows popover on overlap
   * - Resets to POINTER after use
   */
  [TOOLS.ADD_CLICK_CONDITION]: {
    showPopoverOnOverlap: true,
    resetAfterUse: true,
    onActorClick: (actor, _event, ctx) => {
      ctx.dispatch(
        upsertRecordingCondition({
          key: makeId("condition"),
          left: { globalId: "click" },
          right: { constant: actor.id },
          comparator: "=",
          enabled: true,
        })
      );
      ctx.dispatch(selectToolId(TOOLS.POINTER));
      return true;
    },
  },

  /**
   * IGNORE_SQUARE: Mark squares as ignored in the recording extent.
   *
   * Original behavior:
   * - Drag across squares: toggle ignored status
   */
  [TOOLS.IGNORE_SQUARE]: {
    onDragPosition: (position, _isFirst, _event, ctx) => {
      ctx.dispatch(toggleSquareIgnored(position));
    },
  },
};

/**
 * Gets the behavior for a tool, or undefined if the tool has no special behavior.
 */
export function getToolBehavior(toolId: TOOLS): ToolBehavior | undefined {
  return TOOL_BEHAVIORS[toolId];
}

/**
 * Checks if a tool should show the popover when clicking overlapping actors.
 */
export function toolShowsPopoverOnOverlap(toolId: TOOLS): boolean {
  return TOOL_BEHAVIORS[toolId]?.showPopoverOnOverlap ?? false;
}

/**
 * Checks if a tool should reset to POINTER after use.
 */
export function toolResetsAfterUse(toolId: TOOLS): boolean {
  return TOOL_BEHAVIORS[toolId]?.resetAfterUse ?? false;
}

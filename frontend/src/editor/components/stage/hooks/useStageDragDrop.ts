import { useCallback, useRef } from "react";
import { Actor, Characters, Position, RuleExtent, Stage } from "../../../../types";
import { STAGE_CELL_SIZE } from "../../../constants/constants";
import {
  actorFilledPoints,
  actorFillsPoint,
  applyAnchorAdjustment,
  pointIsOutside,
} from "../../../utils/stage-helpers";
import { defaultAppearanceId } from "../../../utils/character-helpers";
import {
  changeActors,
  changeActorsIndividually,
  createActors,
} from "../../../actions/stage-actions";
import { setRecordingExtent } from "../../../actions/recording-actions";
import { PxOffset } from "./useStageCoordinates";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dispatch = (action: any) => void;

/**
 * Data for moving or stamping existing actors.
 */
export interface ActorDropData {
  actorIds: string[];
  dragAnchorActorId: string;
}

/**
 * Data for dropping a new character instance.
 * Note: Uses `appearance` (not `appearanceId`) to match the format used by library.tsx
 */
export interface CharacterDropData {
  characterId: string;
  appearance?: string;
}

/**
 * Data for dropping an appearance change onto an actor.
 */
export interface AppearanceDropData {
  characterId: string;
  appearance: string;
}

/**
 * Mode for actor drops.
 * - "move": Move existing actors to new positions
 * - "stamp-copy": Create copies of actors at new positions
 */
export type DropMode = "stamp-copy" | "move";

/**
 * Handle sides for recording extent handles.
 */
export type HandleSide = "left" | "right" | "top" | "bottom";

// =============================================================================
// Drag Data Creation Utilities
// =============================================================================
// These functions create drag data in the format expected by the parsing functions.
// Use these when setting dataTransfer data to ensure consistency.

/**
 * Creates sprite drop data for existing actors being dragged.
 *
 * @param actorIds - IDs of actors being dragged
 * @param dragAnchorActorId - ID of the actor used as the drag anchor point
 * @returns JSON string to set as "sprite" dataTransfer data
 *
 * @example
 * event.dataTransfer.setData("sprite", createActorSpriteData(["actor1", "actor2"], "actor1"));
 */
export function createActorSpriteData(
  actorIds: string[],
  dragAnchorActorId: string
): string {
  const data: ActorDropData = { actorIds, dragAnchorActorId };
  return JSON.stringify(data);
}

/**
 * Creates sprite drop data for a new character being dragged from the library.
 *
 * @param characterId - ID of the character to create
 * @param appearance - Optional appearance ID (defaults to character's default appearance)
 * @returns JSON string to set as "sprite" dataTransfer data
 *
 * @example
 * event.dataTransfer.setData("sprite", createCharacterSpriteData("char1", "happy"));
 */
export function createCharacterSpriteData(
  characterId: string,
  appearance?: string
): string {
  const data: CharacterDropData = { characterId, appearance };
  return JSON.stringify(data);
}

/**
 * Creates appearance drop data for changing an actor's appearance.
 *
 * @param characterId - ID of the character whose appearance is being applied
 * @param appearance - The appearance ID to apply
 * @returns JSON string to set as "appearance" dataTransfer data
 *
 * @example
 * event.dataTransfer.setData("appearance", createAppearanceData("char1", "happy"));
 */
export function createAppearanceData(
  characterId: string,
  appearance: string
): string {
  const data: AppearanceDropData = { characterId, appearance };
  return JSON.stringify(data);
}

/**
 * Sets handle drag data on a dataTransfer object.
 *
 * @param dataTransfer - The dataTransfer object to set data on
 * @param side - Which handle is being dragged
 *
 * @example
 * setHandleDragData(event.dataTransfer, "left");
 */
export function setHandleDragData(
  dataTransfer: DataTransfer,
  side: HandleSide
): void {
  dataTransfer.setData("handle", "true");
  dataTransfer.setData(`handle:${side}`, "true");
}

// =============================================================================
// Drag Data Parsing Utilities
// =============================================================================

/**
 * Parses sprite drop data from a drag event.
 *
 * @param dataTransfer - The drag event's dataTransfer object
 * @returns ActorDropData if dragging actors, CharacterDropData if dragging a character, or undefined
 */
export function parseSpriteDropData(
  dataTransfer: DataTransfer
): ActorDropData | CharacterDropData | undefined {
  const spriteData = dataTransfer.getData("sprite");
  if (!spriteData) return undefined;

  try {
    const parsed = JSON.parse(spriteData);
    if ("actorIds" in parsed) {
      return parsed as ActorDropData;
    } else if ("characterId" in parsed) {
      return parsed as CharacterDropData;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parses appearance drop data from a drag event.
 *
 * @param dataTransfer - The drag event's dataTransfer object
 * @returns AppearanceDropData or undefined
 */
export function parseAppearanceDropData(
  dataTransfer: DataTransfer
): AppearanceDropData | undefined {
  const appearanceData = dataTransfer.getData("appearance");
  if (!appearanceData) return undefined;

  try {
    return JSON.parse(appearanceData) as AppearanceDropData;
  } catch {
    return undefined;
  }
}

/**
 * Extracts the handle side from a drag event's types.
 *
 * @param types - The dataTransfer types array
 * @returns The handle side ("left", "right", "top", "bottom") or undefined
 */
export function parseHandleSide(
  types: readonly string[]
): "left" | "right" | "top" | "bottom" | undefined {
  const handleType = types.find((t) => t.startsWith("handle:"));
  if (!handleType) return undefined;

  const side = handleType.split(":").pop();
  if (side === "left" || side === "right" || side === "top" || side === "bottom") {
    return side;
  }
  return undefined;
}

/**
 * Calculates the new extent when dragging a recording handle.
 *
 * This is a pure function extracted for testability.
 *
 * @param currentExtent - The current recording extent
 * @param side - Which handle is being dragged
 * @param position - The current drag position (in cell coordinates)
 * @param stageWidth - Width of the stage in cells
 * @param stageHeight - Height of the stage in cells
 * @returns The new extent, or undefined if no change
 */
export function calculateNewExtent(
  currentExtent: RuleExtent,
  side: "left" | "right" | "top" | "bottom",
  position: { x: number; y: number },
  stageWidth: number,
  stageHeight: number
): RuleExtent {
  const nextExtent = { ...currentExtent };

  if (side === "left") {
    nextExtent.xmin = Math.min(
      nextExtent.xmax,
      Math.max(0, Math.round(position.x + 0.25))
    );
  }
  if (side === "right") {
    nextExtent.xmax = Math.max(
      nextExtent.xmin,
      Math.min(stageWidth, Math.round(position.x - 1))
    );
  }
  if (side === "top") {
    nextExtent.ymin = Math.min(
      nextExtent.ymax,
      Math.max(0, Math.round(position.y + 0.25))
    );
  }
  if (side === "bottom") {
    nextExtent.ymax = Math.max(
      nextExtent.ymin,
      Math.min(stageHeight, Math.round(position.y - 1))
    );
  }

  return nextExtent;
}

/**
 * Calculates the position offset between an anchor actor and a target position.
 *
 * @param anchorActor - The actor used as the drag anchor
 * @param targetPosition - The target drop position
 * @returns The offset {x, y} to apply to all dragged actors
 */
export function calculateDropOffset(
  anchorActor: Actor,
  targetPosition: Position
): { offsetX: number; offsetY: number } {
  return {
    offsetX: targetPosition.x - anchorActor.position.x,
    offsetY: targetPosition.y - anchorActor.position.y,
  };
}

/**
 * Checks if an actor clone would overlap with an existing identical actor.
 *
 * This prevents accidentally stamping duplicate actors.
 *
 * @param newActorPoints - Array of point strings like "x,y" that the new actor would fill
 * @param characterId - The character ID of the actor being cloned
 * @param appearance - The appearance of the actor being cloned
 * @param stageActors - All actors on the stage
 * @param characters - All character definitions
 * @returns true if a clone already exists at this position
 */
export function cloneExistsAtPosition(
  newActorPoints: string[],
  characterId: string,
  appearance: string,
  stageActors: { [id: string]: Actor },
  characters: Characters
): boolean {
  return Object.values(stageActors).some(
    (a) =>
      a.characterId === characterId &&
      a.appearance === appearance &&
      actorFilledPoints(a, characters).some((p) =>
        newActorPoints.includes(`${p.x},${p.y}`)
      )
  );
}

/**
 * Configuration for the useStageDragDrop hook.
 */
export interface StageDragDropConfig {
  /** Redux dispatch function */
  dispatch: Dispatch;
  /** The current stage */
  stage: Stage;
  /** World ID */
  worldId: string;
  /** All character definitions */
  characters: Characters;
  /** Current recording extent (if any) */
  recordingExtent?: RuleExtent;
  /** Function to get grid position from an event */
  getPositionForEvent: (event: React.DragEvent) => Position;
  /** Ref to the stage DOM element */
  stageElRef: React.RefObject<HTMLDivElement>;
}

/**
 * Hook that manages drag and drop operations on the Stage.
 *
 * This hook handles:
 * - Dropping sprites (actors or characters) onto the stage
 * - Dropping appearance changes onto actors
 * - Dragging recording extent handles
 * - Stamping actors during tool drags
 *
 * ## Pure Functions
 *
 * The following functions are exported for testability:
 * - `parseSpriteDropData`: Parses sprite data from dataTransfer
 * - `parseAppearanceDropData`: Parses appearance data from dataTransfer
 * - `parseHandleSide`: Extracts handle side from dataTransfer types
 * - `calculateNewExtent`: Calculates new extent when dragging handles
 * - `calculateDropOffset`: Calculates offset for actor drops
 * - `cloneExistsAtPosition`: Checks for duplicate actors
 *
 * ## Capture Semantics
 *
 * - `stageElRef` is a ref, read at call time
 * - `stage`, `characters`, `recordingExtent` are captured when callbacks are recreated
 * - `getPositionForEvent` is a callback from useStageCoordinates
 *
 * @param config - Configuration object
 * @returns Object with drag/drop handlers and helper functions
 */
export function useStageDragDrop(config: StageDragDropConfig) {
  const {
    dispatch,
    stage,
    worldId,
    characters,
    recordingExtent,
    getPositionForEvent,
    stageElRef,
  } = config;

  // Track last fired extent to avoid redundant dispatches
  const lastFiredExtent = useRef<string | null>(null);

  /**
   * Updates the recording extent based on a handle drag.
   */
  const onUpdateHandle = useCallback(
    (event: React.DragEvent) => {
      if (!recordingExtent) return;

      const side = parseHandleSide(event.dataTransfer.types);
      if (!side) return;

      const stageOffset = stageElRef.current!.getBoundingClientRect();
      const position = {
        x: (event.clientX - stageOffset.left) / STAGE_CELL_SIZE,
        y: (event.clientY - stageOffset.top) / STAGE_CELL_SIZE,
      };

      const nextExtent = calculateNewExtent(
        recordingExtent,
        side,
        position,
        stage.width,
        stage.height
      );

      const str = JSON.stringify(nextExtent);
      if (lastFiredExtent.current === str) {
        return;
      }
      lastFiredExtent.current = str;
      dispatch(setRecordingExtent(nextExtent));
    },
    // Note: stageElRef intentionally excluded - refs are stable across renders
    [dispatch, recordingExtent, stage.width, stage.height]
  );

  /**
   * Drops an appearance change onto an actor.
   */
  const onDropAppearance = useCallback(
    (event: React.DragEvent) => {
      const data = parseAppearanceDropData(event.dataTransfer);
      if (!data) return;

      const { appearance, characterId } = data;
      const position = getPositionForEvent(event);

      if (recordingExtent && pointIsOutside(position, recordingExtent)) {
        return;
      }

      const actor = Object.values(stage.actors).find(
        (a) =>
          actorFillsPoint(a, characters, position) &&
          a.characterId === characterId
      );

      if (actor) {
        const sel = {
          worldId,
          stageId: stage.id,
          actorIds: [actor.id],
        };
        dispatch(changeActors(sel, { appearance }));
      }
    },
    [
      dispatch,
      stage.actors,
      stage.id,
      worldId,
      characters,
      recordingExtent,
      getPositionForEvent,
    ]
  );

  /**
   * Drops actors at a position (move or stamp-copy).
   */
  const onDropActorsAtPosition = useCallback(
    (data: ActorDropData, position: Position, mode: DropMode) => {
      if (recordingExtent && pointIsOutside(position, recordingExtent)) {
        return;
      }

      const anchorActor = stage.actors[data.dragAnchorActorId];
      if (!anchorActor) return;

      const anchorCharacter = characters[anchorActor.characterId];
      applyAnchorAdjustment(position, anchorCharacter, anchorActor);

      const { offsetX, offsetY } = calculateDropOffset(anchorActor, position);

      if (offsetX === 0 && offsetY === 0) {
        // Attempting to drop in the same place we started the drag
        return;
      }

      if (mode === "stamp-copy") {
        const creates = data.actorIds
          .map((aid) => {
            const actor = stage.actors[aid];
            if (!actor) return undefined;

            const character = characters[actor.characterId];
            const clonedActor = {
              ...actor,
              position: {
                x: actor.position.x + offsetX,
                y: actor.position.y + offsetY,
              },
            };
            const clonedActorPoints = actorFilledPoints(
              clonedActor,
              characters
            ).map((p) => `${p.x},${p.y}`);

            // Don't create if an identical actor already overlaps
            if (
              cloneExistsAtPosition(
                clonedActorPoints,
                actor.characterId,
                actor.appearance,
                stage.actors,
                characters
              )
            ) {
              return undefined;
            }

            return { character, initialValues: clonedActor };
          })
          .filter((c): c is NonNullable<typeof c> => !!c);

        if (creates.length > 0) {
          dispatch(createActors(worldId, stage.id, creates));
        }
      } else if (mode === "move") {
        const upserts = data.actorIds.map((aid) => ({
          id: aid,
          values: {
            position: {
              x: stage.actors[aid].position.x + offsetX,
              y: stage.actors[aid].position.y + offsetY,
            },
          },
        }));
        dispatch(changeActorsIndividually(worldId, stage.id, upserts));
      }
    },
    [dispatch, stage.actors, stage.id, worldId, characters, recordingExtent]
  );

  /**
   * Drops a new character instance at a position.
   */
  const onDropCharacterAtPosition = useCallback(
    (data: CharacterDropData, position: Position) => {
      if (recordingExtent && pointIsOutside(position, recordingExtent)) {
        return;
      }

      const character = characters[data.characterId];
      if (!character) return;

      const appearance =
        data.appearance ?? defaultAppearanceId(character.spritesheet);
      const newActor = { position, appearance } as Actor;
      applyAnchorAdjustment(position, character, newActor);

      const newActorPoints = actorFilledPoints(newActor, characters).map(
        (p) => `${p.x},${p.y}`
      );

      // Check if an identical actor already exists at this position
      const positionContainsCloneAlready = Object.values(stage.actors).find(
        (a) =>
          a.characterId === data.characterId &&
          actorFilledPoints(a, characters).some((p) =>
            newActorPoints.includes(`${p.x},${p.y}`)
          )
      );

      if (positionContainsCloneAlready) {
        return;
      }

      dispatch(
        createActors(worldId, stage.id, [{ character, initialValues: newActor }])
      );
    },
    [dispatch, stage.actors, stage.id, worldId, characters, recordingExtent]
  );

  /**
   * Handles sprite drops (actors or characters).
   */
  const onDropSprite = useCallback(
    (event: React.DragEvent) => {
      const data = parseSpriteDropData(event.dataTransfer);
      if (!data) return;

      const position = getPositionForEvent(event);

      if ("actorIds" in data) {
        const mode: DropMode = event.altKey ? "stamp-copy" : "move";
        onDropActorsAtPosition(data, position, mode);
      } else if ("characterId" in data) {
        onDropCharacterAtPosition(data, position);
      }
    },
    [getPositionForEvent, onDropActorsAtPosition, onDropCharacterAtPosition]
  );

  /**
   * Stamps actors at a position (used by STAMP tool during drag).
   */
  const onStampAtPosition = useCallback(
    (
      position: Position,
      stampItem:
        | { actorIds: string[]; worldId: string; stageId: string }
        | CharacterDropData
        | null
    ) => {
      if (!stampItem) return;

      if ("actorIds" in stampItem) {
        const data: ActorDropData = {
          actorIds: stampItem.actorIds,
          dragAnchorActorId: stampItem.actorIds[0],
        };
        onDropActorsAtPosition(data, position, "stamp-copy");
      } else if ("characterId" in stampItem) {
        onDropCharacterAtPosition(stampItem, position);
      }
    },
    [onDropActorsAtPosition, onDropCharacterAtPosition]
  );

  /**
   * Main dragOver handler for the stage.
   */
  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer.types.includes("handle")) {
        onUpdateHandle(event);
      }
    },
    [onUpdateHandle]
  );

  /**
   * Main drop handler for the stage.
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (event.dataTransfer.types.includes("sprite")) {
        onDropSprite(event);
      }
      if (event.dataTransfer.types.includes("appearance")) {
        onDropAppearance(event);
      }
      if (event.dataTransfer.types.includes("handle")) {
        onUpdateHandle(event);
      }
    },
    [onDropSprite, onDropAppearance, onUpdateHandle]
  );

  return {
    onDragOver,
    onDrop,
    onStampAtPosition,
    // Expose lower-level functions for advanced use cases
    onDropActorsAtPosition,
    onDropCharacterAtPosition,
  };
}

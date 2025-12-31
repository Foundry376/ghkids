import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ActorSprite from "../sprites/actor-sprite";
import ActorSelectionPopover from "./actor-selection-popover";
import RecordingHandle from "../sprites/recording-handle";
import RecordingIgnoredSprite from "../sprites/recording-ignored-sprite";
import RecordingMaskSprite from "../sprites/recording-mask-sprite";
import { RecordingSquareStatus } from "../sprites/recording-square-status";

import {
  setupRecordingForActor,
  toggleSquareIgnored,
  upsertRecordingCondition,
} from "../../actions/recording-actions";
import {
  deleteActors,
  recordClickForGameState,
  recordKeyForGameState,
} from "../../actions/stage-actions";
import {
  paintCharacterAppearance,
  select,
  selectToolId,
  selectToolItem,
} from "../../actions/ui-actions";

import { STAGE_CELL_SIZE, TOOLS } from "../../constants/constants";
import { extentIgnoredPositions } from "../../utils/recording-helpers";
import {
  actorsAtPoint,
  buildActorSelection,
} from "../../utils/stage-helpers";

import {
  Actor,
  Characters,
  EditorState,
  EvaluatedSquare,
  Position,
  RuleExtent,
  Stage as StageType,
  UIState,
  WorldMinimal,
} from "../../../types";
import { makeId } from "../../utils/utils";
import { keyToCodakoKey } from "../modal-keypicker/keyboard";

// Import extracted hooks
import {
  useStageCoordinates,
  useStageZoom,
  useStageSelection,
  useStagePopover,
  useStageDragDrop,
  STAGE_ZOOM_STEPS,
} from "./hooks";

// Import tool behaviors (ToolContext for type annotation)
import { ToolContext } from "./tools/tool-behaviors";

interface StageProps {
  stage: StageType;
  world: WorldMinimal;
  recordingExtent?: RuleExtent;
  recordingCentered?: boolean;
  evaluatedSquares?: EvaluatedSquare[];
  readonly?: boolean;
  style?: CSSProperties;
}

type Offset = { top: string | number; left: string | number };
type MouseStatus = { isDown: boolean; visited: { [posKey: string]: true } };

const DRAGGABLE_TOOLS = [TOOLS.IGNORE_SQUARE, TOOLS.TRASH, TOOLS.STAMP];

// Threshold for detecting stage wrapping. When an actor's position changes by more
// than this many cells in a single frame, we assume it wrapped around the stage edge
// and skip the CSS transition animation (by changing the React key).
const WRAP_DETECTION_THRESHOLD = 6;

// Re-export for backwards compatibility
export { STAGE_ZOOM_STEPS };

export const Stage = ({
  recordingExtent,
  recordingCentered,
  evaluatedSquares,
  stage,
  world,
  readonly,
  style,
}: StageProps) => {
  const [{ top, left }, setOffset] = useState<Offset>({ top: 0, left: 0 });

  const lastActorPositions = useRef<{ [actorId: string]: Position }>({});

  const mouse = useRef<MouseStatus>({ isDown: false, visited: {} });
  const scrollEl = useRef<HTMLDivElement | null>(null);
  const stageEl = useRef<HTMLDivElement | null>(null);

  // Use extracted zoom hook
  const scale = useStageZoom(scrollEl, stageEl, stage, recordingCentered);

  // Use extracted coordinate hook
  const coords = useStageCoordinates(stageEl, scale);

  // Use extracted selection hook
  const selection = useStageSelection();

  // Use extracted popover hook
  const popover = useStagePopover();

  const dispatch = useDispatch();
  const characters = useSelector<EditorState, Characters>((state) => state.characters);
  const { selectedActors, selectedToolId, stampToolItem, playback } = useSelector<
    EditorState,
    Pick<UIState, "selectedActors" | "selectedToolId" | "stampToolItem" | "playback">
  >((state) => ({
    selectedActors: state.ui.selectedActors,
    selectedToolId: state.ui.selectedToolId,
    stampToolItem: state.ui.stampToolItem,
    playback: state.ui.playback,
  }));

  // Helpers
  const selFor = useCallback(
    (actorIds: string[]) => buildActorSelection(world.id, stage.id, actorIds),
    [world.id, stage.id]
  );

  const selected = useMemo(
    () =>
      selectedActors && selectedActors?.worldId === world.id && selectedActors?.stageId === stage.id
        ? selectedActors.actorIds.map((a) => stage.actors[a]).filter(Boolean)
        : [],
    [selectedActors, world.id, stage.id, stage.actors]
  );

  const centerOnExtent = useCallback(() => {
    if (!recordingExtent) {
      return { left: 0, top: 0 };
    }
    const { xmin, ymin, xmax, ymax } = recordingExtent;
    const xCenter = xmin + 0.5 + (xmax - xmin) / 2.0;
    const yCenter = ymin + 0.5 + (ymax - ymin) / 2.0;
    return {
      left: `calc(-${xCenter * STAGE_CELL_SIZE}px + 50%)`,
      top: `calc(-${yCenter * STAGE_CELL_SIZE}px + 50%)`,
    };
  }, [recordingExtent]);

  // Use extracted drag/drop hook
  const dragDrop = useStageDragDrop({
    dispatch,
    stage,
    worldId: world.id,
    characters,
    recordingExtent,
    getPositionForEvent: coords.getPositionForEvent,
    stageElRef: stageEl,
  });

  // Build tool context for tool behaviors
  const toolContext: ToolContext = useMemo(
    () => ({
      dispatch,
      stage,
      world,
      characters,
      recordingExtent,
      selected,
      selFor,
      stampToolItem,
      playback,
      showPopover: (actors, pos) => popover.showPopover(actors, pos, selectedToolId),
      isPopoverOpen: popover.isOpen,
    }),
    [
      dispatch,
      stage,
      world,
      characters,
      recordingExtent,
      selected,
      selFor,
      stampToolItem,
      playback,
      popover,
      selectedToolId,
    ]
  );

  // This effect runs on every render to:
  // 1. Keep focus on stage during playback (for keyboard input)
  // 2. Recalculate offset when recording extent changes
  // We intentionally omit dependencies to run every render, matching the original behavior.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playback.running && stageEl.current) {
      stageEl.current.focus();
    }

    let offset: Offset = { top: 0, left: 0 };
    if (recordingExtent && recordingCentered) {
      offset = centerOnExtent();
    }

    if (top !== offset.top || left !== offset.left) {
      setOffset(offset);
    }
  });

  const onBlur = () => {
    if (playback.running) {
      stageEl.current?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const isShortcut = event.metaKey || event.ctrlKey;

    if (isShortcut && event.key === "a") {
      dispatch(select(null, selFor(Object.keys(stage.actors))));
      event.preventDefault();
      return;
    }
    if (event.shiftKey || isShortcut) {
      // do not catch these events, they're probably actual hotkeys
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Delete" || event.key === "Backspace") {
      if (selected.length) {
        dispatch(deleteActors(selFor(selected.map((a) => a.id))));
      }
      return;
    }

    dispatch(recordKeyForGameState(world.id, keyToCodakoKey(`${event.key}`)));
  };

  /**
   * Handles mouse up on an actor.
   *
   * This follows the Integration Contract from tool-behaviors.ts.
   *
   * Note: While tool-behaviors.ts provides declarative tool behavior definitions,
   * we keep the logic inline here during refactoring to minimize risk of behavior
   * changes. The tool-behaviors.ts file serves as documentation and as a reference
   * for future refactoring that could call behaviors directly. The current inline
   * implementation exactly matches the original stage.tsx behavior.
   */
  const onMouseUpActor = (actor: Actor, event: React.MouseEvent) => {
    let handled = false;

    // Helper to check for overlapping actors and show popover if needed
    const showPopoverIfOverlapping = (toolId: string): boolean => {
      const overlapping = actorsAtPoint(stage.actors, characters, actor.position);
      if (overlapping.length > 1) {
        popover.showPopover(overlapping, { x: event.clientX, y: event.clientY }, toolId);
        return true;
      }
      return false;
    };

    // Special handling for tools with specific popover behavior
    switch (selectedToolId) {
      case TOOLS.PAINT:
        if (!showPopoverIfOverlapping(TOOLS.PAINT)) {
          dispatch(paintCharacterAppearance(actor.characterId, actor.appearance));
        }
        handled = true;
        break;
      case TOOLS.STAMP:
        if (!stampToolItem) {
          if (!showPopoverIfOverlapping(TOOLS.STAMP)) {
            dispatch(selectToolItem(selFor([actor.id])));
          }
          handled = true;
        }
        break;
      case TOOLS.RECORD:
        if (!showPopoverIfOverlapping(TOOLS.RECORD)) {
          dispatch(setupRecordingForActor({ characterId: actor.characterId, actor }));
          dispatch(selectToolId(TOOLS.POINTER));
        }
        handled = true;
        break;
      case TOOLS.ADD_CLICK_CONDITION:
        if (!showPopoverIfOverlapping(TOOLS.ADD_CLICK_CONDITION)) {
          dispatch(
            upsertRecordingCondition({
              key: makeId("condition"),
              left: { globalId: "click" },
              right: { constant: actor.id },
              comparator: "=",
              enabled: true,
            }),
          );
          dispatch(selectToolId(TOOLS.POINTER));
        }
        handled = true;
        break;
      case TOOLS.POINTER:
        if (playback.running) {
          dispatch(recordClickForGameState(world.id, actor.id));
        } else if (event.shiftKey) {
          const selectedIds = selected.map((a) => a.id);
          dispatch(
            select(
              actor.characterId,
              selFor(
                selectedIds.includes(actor.id)
                  ? selectedIds.filter((a) => a !== actor.id)
                  : [...selectedIds, actor.id],
              ),
            ),
          );
        } else {
          if (!showPopoverIfOverlapping(TOOLS.POINTER)) {
            dispatch(select(actor.characterId, selFor([actor.id])));
          }
        }
        handled = true;
        break;
    }

    // If we didn't handle the event, let it bubble up to the stage onClick handler

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onMouseDown = (event: React.MouseEvent) => {
    if (playback.running) {
      return;
    }
    const onMouseUpAnywhere = (e: MouseEvent) => {
      document.removeEventListener("mouseup", onMouseUpAnywhere);
      document.removeEventListener("mousemove", onMouseMoveAnywhere);
      onMouseUp.current?.(e);
    };
    const onMouseMoveAnywhere = (e: MouseEvent) => {
      onMouseMove.current?.(e);
    };
    document.addEventListener("mouseup", onMouseUpAnywhere);
    document.addEventListener("mousemove", onMouseMoveAnywhere);
    mouse.current = { isDown: true, visited: {} };

    const isClickOnBackground = event.target === event.currentTarget;
    if (selectedToolId === TOOLS.POINTER && isClickOnBackground) {
      selection.startSelection(coords.getPxOffsetForEvent(event));
    } else {
      selection.cancelSelection();
    }
  };

  // Note: In this handler, the mouse cursor may be outside the stage
  // CRITICAL: This ref is reassigned every render to capture latest state
  const onMouseMove = useRef<(event: MouseEvent) => void>();
  onMouseMove.current = (event: MouseEvent) => {
    if (!mouse.current.isDown) {
      return;
    }

    // If we are dragging to select a region, update the region.
    // Otherwise, process this event as a tool stroke.
    if (selection.isSelecting) {
      selection.updateSelection(coords.getPxOffsetForEvent(event));
      return;
    }

    const { x, y } = coords.getPositionForEvent(event);
    if (!(x >= 0 && x < stage.width && y >= 0 && y < stage.height)) {
      return;
    }
    const posKey = `${x},${y}`;
    if (mouse.current.visited[posKey]) {
      return;
    }
    mouse.current.visited[posKey] = true;

    if (selectedToolId === TOOLS.IGNORE_SQUARE) {
      dispatch(toggleSquareIgnored({ x, y }));
    }
    if (selectedToolId === TOOLS.STAMP) {
      dragDrop.onStampAtPosition({ x, y }, stampToolItem);
    }
    if (selectedToolId === TOOLS.TRASH) {
      // If popover is open, skip - we're waiting for user to pick from the popover
      if (popover.isOpen) {
        return;
      }

      const overlapping = actorsAtPoint(stage.actors, characters, { x, y });

      // On initial click (not drag), show popover if multiple actors overlap
      const isFirstClick = Object.keys(mouse.current.visited).length === 1;
      if (isFirstClick && overlapping.length > 1) {
        popover.showPopover(overlapping, { x: event.clientX, y: event.clientY }, TOOLS.TRASH);
        return;
      }

      // For drag or single actor, delete the topmost actor
      const actor = overlapping[overlapping.length - 1];
      if (actor) {
        // If the clicked actor is part of the selection, delete all selected actors
        const selectedIds = selected.map((a) => a.id);
        if (selectedIds.includes(actor.id)) {
          dispatch(deleteActors(selFor(selectedIds)));
        } else {
          dispatch(deleteActors(selFor([actor.id])));
        }
      }
    }
  };

  // Note: In this handler, the mouse cursor may be outside the stage
  // CRITICAL: This ref is reassigned every render to capture latest state
  const onMouseUp = useRef<(event: MouseEvent) => void>();
  onMouseUp.current = (event: MouseEvent) => {
    // Process final position as a drag event (click-as-drag behavior)
    onMouseMove.current?.(event);

    mouse.current = { isDown: false, visited: {} };

    // Handle selection rectangle completion
    if (selection.isSelecting) {
      selection.finishSelection(scale, stage.actors, (characterId, actorIds) => {
        dispatch(select(characterId, selFor(actorIds)));
      });
    }

    // Reset tool after use (unless shift held)
    if (!event.shiftKey && !event.defaultPrevented) {
      if (
        TOOLS.TRASH === selectedToolId ||
        TOOLS.STAMP === selectedToolId ||
        TOOLS.RECORD === selectedToolId ||
        TOOLS.PAINT === selectedToolId
      ) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  const onRightClickStage = (event: React.MouseEvent) => {
    event.preventDefault();
    if (selectedToolId !== TOOLS.POINTER) {
      dispatch(selectToolId(TOOLS.POINTER));
    }
  };

  const onSelectActor = (actor: Actor) => {
    if (selectedToolId === TOOLS.POINTER) {
      dispatch(select(actor.characterId, selFor([actor.id])));
    }
  };

  const onPopoverSelectActor = (actor: Actor) => {
    if (!popover.popover) return;

    const { toolId } = popover.popover;

    switch (toolId) {
      case TOOLS.PAINT:
        dispatch(paintCharacterAppearance(actor.characterId, actor.appearance));
        break;
      case TOOLS.STAMP:
        dispatch(selectToolItem(selFor([actor.id])));
        break;
      case TOOLS.RECORD:
        dispatch(setupRecordingForActor({ characterId: actor.characterId, actor }));
        dispatch(selectToolId(TOOLS.POINTER));
        break;
      case TOOLS.ADD_CLICK_CONDITION:
        dispatch(
          upsertRecordingCondition({
            key: makeId("condition"),
            left: { globalId: "click" },
            right: { constant: actor.id },
            comparator: "=",
            enabled: true,
          }),
        );
        dispatch(selectToolId(TOOLS.POINTER));
        break;
      case TOOLS.TRASH:
        dispatch(deleteActors(selFor([actor.id])));
        break;
      case TOOLS.POINTER:
      default:
        dispatch(select(actor.characterId, selFor([actor.id])));
        break;
    }

    popover.closePopover();
  };

  const onPopoverDragStart = () => {
    // Close the popover when drag starts - the drag will continue to the stage
    popover.closePopover();
  };

  const onPopoverClose = () => {
    popover.closePopover();
  };

  const renderRecordingExtent = () => {
    const { width, height } = stage;
    if (!recordingExtent) {
      return [];
    }

    const components: React.ReactNode[] = [];
    const { xmin, xmax, ymin, ymax } = recordingExtent;

    // add the dark squares
    components.push(
      <RecordingMaskSprite key={`mask-top`} xmin={0} xmax={width} ymin={0} ymax={ymin} />,
      <RecordingMaskSprite
        key={`mask-bottom`}
        xmin={0}
        xmax={width}
        ymin={ymax + 1}
        ymax={height}
      />,
      <RecordingMaskSprite key={`mask-left`} xmin={0} xmax={xmin} ymin={ymin} ymax={ymax + 1} />,
      <RecordingMaskSprite
        key={`mask-right`}
        xmin={xmax + 1}
        xmax={width}
        ymin={ymin}
        ymax={ymax + 1}
      />,
    );

    // add the ignored squares
    extentIgnoredPositions(recordingExtent)
      .filter(({ x, y }) => x >= xmin && x <= xmax && y >= ymin && y <= ymax)
      .forEach(({ x, y }) => {
        components.push(<RecordingIgnoredSprite x={x} y={y} key={`ignored-${x}-${y}`} />);
      });

    // add square status overlay if provided
    if (evaluatedSquares && evaluatedSquares.length > 0) {
      components.push(
        <RecordingSquareStatus
          key="square-status"
          squares={evaluatedSquares}
          extentXMin={xmin}
          extentYMin={ymin}
        />,
      );
    }

    // add the handles
    const handles = {
      top: [xmin + (xmax - xmin) / 2.0, ymin - 1],
      bottom: [xmin + (xmax - xmin) / 2.0, ymax + 1],
      left: [xmin - 1, ymin + (ymax - ymin) / 2.0],
      right: [xmax + 1, ymin + (ymax - ymin) / 2.0],
    };
    for (const [side, [x, y]] of Object.entries(handles)) {
      components.push(<RecordingHandle key={side} side={side} position={{ x, y }} />);
    }

    return components;
  };

  if (!stage) {
    return (
      <div style={style} ref={scrollEl} className="stage-scroll-wrap" />
    );
  }

  const backgroundValue =
    typeof stage.background === "string"
      ? stage.background.includes("/Layer0_2.png")
        ? `url(${new URL(`/src/editor/img/backgrounds/Layer0_2.png`, import.meta.url).href})`
        : stage.background
      : "";

  // linear gradient to blur cover the background image
  const backgroundCSS = `url('/src/editor/img/board-grid.png') top left / ${STAGE_CELL_SIZE}px,
    linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)),
    ${backgroundValue}${backgroundValue?.includes("url(") ? " 50% 50% / cover" : ""}`;

  const renderActor = (actor: Actor) => {
    const character = characters[actor.characterId];

    // Prevent animating when an actor wraps off one end of the stage to the other
    // by assigning it a new react key.
    const lastPosition = lastActorPositions.current[actor.id] || {
      x: Number.NaN,
      y: Number.NaN,
    };
    const didWrap =
      Math.abs(lastPosition.x - actor.position.x) > WRAP_DETECTION_THRESHOLD ||
      Math.abs(lastPosition.y - actor.position.y) > WRAP_DETECTION_THRESHOLD;
    lastActorPositions.current[actor.id] = Object.assign({}, actor.position);

    const draggable = !readonly && !DRAGGABLE_TOOLS.includes(selectedToolId);
    const animationStyle = actor.animationStyle || "linear";
    return (
      <ActorSprite
        key={`${actor.id}-${didWrap}`}
        selected={selected.includes(actor)}
        onMouseUp={(event) => onMouseUpActor(actor, event)}
        onDoubleClick={() => onSelectActor(actor)}
        transitionDuration={
          animationStyle === "linear" ? playback.speed / (actor.frameCount || 1) : 0
        }
        character={character}
        actor={actor}
        dragActorIds={
          draggable && !playback.running
            ? selected.includes(actor)
              ? selected.map((a) => a.id)
              : [actor.id]
            : undefined
        }
      />
    );
  };

  return (
    <div
      style={style}
      ref={scrollEl}
      data-stage-wrap-id={world.id}
      data-stage-zoom={scale}
      className={`stage-scroll-wrap tool-supported running-${playback.running}`}
    >
      <div
        ref={stageEl}
        style={
          {
            top,
            left,
            width: stage.width * STAGE_CELL_SIZE,
            height: stage.height * STAGE_CELL_SIZE,
            overflow: recordingExtent ? "visible" : "hidden",
            zoom: scale,
            "--outline-width": `${2.0 / scale}px`,
          } as CSSProperties
        }
        className="stage"
        onDragOver={dragDrop.onDragOver}
        onDrop={dragDrop.onDrop}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onContextMenu={onRightClickStage}
        onMouseDown={onMouseDown}
        tabIndex={0}
      >
        <div
          className="background"
          style={{
            position: "absolute",
            width: stage.width * STAGE_CELL_SIZE,
            height: stage.height * STAGE_CELL_SIZE,
            background: backgroundCSS,
            pointerEvents: "none",
            filter: "brightness(1) saturate(0.8)",
          }}
        />

        {Object.values(stage.actors).map(renderActor)}

        {recordingExtent ? renderRecordingExtent() : []}
      </div>
      {selection.selectionRect ? (
        <div
          className="stage-selection-box"
          style={{
            position: "absolute",
            left: Math.min(selection.selectionRect.start.left, selection.selectionRect.end.left),
            top: Math.min(selection.selectionRect.start.top, selection.selectionRect.end.top),
            width:
              Math.max(selection.selectionRect.start.left, selection.selectionRect.end.left) -
              Math.min(selection.selectionRect.start.left, selection.selectionRect.end.left),
            height:
              Math.max(selection.selectionRect.start.top, selection.selectionRect.end.top) -
              Math.min(selection.selectionRect.start.top, selection.selectionRect.end.top),
          }}
        />
      ) : null}
      {popover.popover && (
        <ActorSelectionPopover
          actors={popover.popover.actors}
          characters={characters}
          position={popover.popover.position}
          onSelect={onPopoverSelectActor}
          onDragStart={onPopoverDragStart}
          onClose={onPopoverClose}
        />
      )}
    </div>
  );
};

export default Stage;

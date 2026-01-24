import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import ActorSprite from "../sprites/actor-sprite";
import ActorSelectionPopover from "./actor-selection-popover";
import RecordingHandle from "../sprites/recording-handle";
import RecordingIgnoredSprite from "../sprites/recording-ignored-sprite";
import RecordingMaskSprite from "../sprites/recording-mask-sprite";
import { RecordingSquareStatus } from "../sprites/recording-square-status";

import {
  setRecordingExtent,
  setupRecordingForActor,
  toggleSquareIgnored,
  upsertRecordingCondition,
} from "../../actions/recording-actions";
import {
  changeActors,
  changeActorsIndividually,
  createActors,
  deleteActors,
  recordInputForGameState,
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
  actorFilledPoints,
  actorFillsPoint,
  actorsAtPoint,
  applyAnchorAdjustment,
  buildActorSelection,
  pointIsOutside,
} from "../../utils/stage-helpers";

import {
  Actor,
  EvaluatedSquare,
  Position,
  RuleExtent,
  Stage as StageType,
  WorldMinimal,
} from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { defaultAppearanceId } from "../../utils/character-helpers";
import { makeId } from "../../utils/utils";
import { keyToCodakoKey } from "../modal-keypicker/keyboard";

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
type SelectionRect = { start: { top: number; left: number }; end: { top: number; left: number } };

const DRAGGABLE_TOOLS = [TOOLS.IGNORE_SQUARE, TOOLS.TRASH, TOOLS.STAMP];

export const STAGE_ZOOM_STEPS = [1, 0.88, 0.75, 0.63, 0.5, 0.42, 0.38];

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
  const [scale, setScale] = useState(
    stage.scale && typeof stage.scale === "number" ? stage.scale : 1,
  );

  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [actorSelectionPopover, setActorSelectionPopover] = useState<{
    actors: Actor[];
    position: { x: number; y: number };
    toolId: string;
  } | null>(null);

  const lastFiredExtent = useRef<string | null>(null);
  const lastActorPositions = useRef<{ [actorId: string]: Position }>({});

  const mouse = useRef<MouseStatus>({ isDown: false, visited: {} });
  const scrollEl = useRef<HTMLDivElement | null>();
  const el = useRef<HTMLDivElement | null>();
  const heldKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const autofit = () => {
      const _scrollEl = scrollEl.current;
      const _el = el.current;
      if (!_scrollEl || !_el) {
        return;
      }
      if (recordingCentered) {
        setScale(1);
      } else if (stage.scale === "fit") {
        _el.style.zoom = "1"; // this needs to be here for scaling "up" to work
        const fit = Math.min(
          _scrollEl.clientWidth / (stage.width * STAGE_CELL_SIZE),
          _scrollEl.clientHeight / (stage.height * STAGE_CELL_SIZE),
        );
        const best = STAGE_ZOOM_STEPS.find((z) => z <= fit) || fit;
        _el.style.zoom = `${best}`;
        setScale(best);
      } else {
        setScale(stage.scale ?? 1);
      }
    };
    window.addEventListener("resize", autofit);
    autofit();
    return () => window.removeEventListener("resize", autofit);
  }, [stage.height, stage.scale, stage.width, recordingCentered]);

  const dispatch = useDispatch();
  const characters = useEditorSelector((state) => state.characters);
  const { selectedActors, selectedToolId, stampToolItem, playback } = useEditorSelector(
    (state) => ({
      selectedActors: state.ui.selectedActors,
      selectedToolId: state.ui.selectedToolId,
      stampToolItem: state.ui.stampToolItem,
      playback: state.ui.playback,
    }),
  );

  // Helpers

  const selFor = (actorIds: string[]) => {
    return buildActorSelection(world.id, stage.id, actorIds);
  };

  const selected =
    selectedActors && selectedActors?.worldId === world.id && selectedActors?.stageId === stage.id
      ? selectedActors.actorIds.map((a) => stage.actors[a])
      : [];

  const centerOnExtent = () => {
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
  };

  const centerOnActor = (actorId: string): Offset | null => {
    if (!actorId) return null;

    const actor = stage.actors[actorId];
    if (!actor) return null;

    // Calculate actor center position (add 0.5 to center on the cell)
    const xCenter = actor.position.x + 0.5;
    const yCenter = actor.position.y + 0.5;

    return {
      left: `calc(-${xCenter * STAGE_CELL_SIZE}px + 50%)`,
      top: `calc(-${yCenter * STAGE_CELL_SIZE}px + 50%)`,
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playback.running && el.current) {
      el.current.focus();
    }

    let offset: Offset = { top: 0, left: 0 };
    if (recordingExtent && recordingCentered) {
      offset = centerOnExtent();
    }

    if (top !== offset.top || left !== offset.left) {
      setOffset(offset);
    }
  });

  // Camera follow effect - center on followed actor after each tick during playback
  useEffect(() => {
    if (!playback.running) return;
    if (recordingExtent && recordingCentered) return; // Don't override recording centering

    const cameraFollowId = world.globals?.cameraFollow?.value;
    if (!cameraFollowId) return;

    // Check if stage is overflowing (needs scrolling)
    const scrollWrapper = scrollEl.current;
    if (!scrollWrapper) return;

    const stageWidth = stage.width * STAGE_CELL_SIZE * scale;
    const stageHeight = stage.height * STAGE_CELL_SIZE * scale;
    const isOverflowing =
      stageWidth > scrollWrapper.clientWidth || stageHeight > scrollWrapper.clientHeight;

    if (!isOverflowing) return;

    const newOffset = centerOnActor(cameraFollowId);
    if (newOffset) {
      setOffset(newOffset);
    }
  }, [
    playback.running,
    stage.actors,
    stage.width,
    stage.height,
    world.globals?.cameraFollow?.value,
    scale,
    recordingExtent,
    recordingCentered,
  ]);

  const onBlur = () => {
    if (playback.running) {
      el.current?.focus();
    }
  };

  // Track currently-held keys at document level so they're available even when stage isn't focused
  useEffect(() => {
    const syncHeldKeys = () => {
      const keysObj: { [key: string]: true } = {};
      heldKeysRef.current.forEach((key) => {
        keysObj[key] = true;
      });
      dispatch(recordInputForGameState(world.id, { keys: keysObj }));
    };

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore modifier key combos (shortcuts)
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const codakoKey = keyToCodakoKey(event.key);
      if (!heldKeysRef.current.has(codakoKey)) {
        heldKeysRef.current.add(codakoKey);
        syncHeldKeys();
      }
    };

    const onDocumentKeyUp = (event: KeyboardEvent) => {
      const codakoKey = keyToCodakoKey(event.key);
      if (heldKeysRef.current.has(codakoKey)) {
        heldKeysRef.current.delete(codakoKey);
        syncHeldKeys();
      }
    };

    // Clear all held keys when window loses focus (user switches tabs/apps)
    const onWindowBlur = () => {
      if (heldKeysRef.current.size > 0) {
        heldKeysRef.current.clear();
        syncHeldKeys();
      }
    };

    document.addEventListener("keydown", onDocumentKeyDown);
    document.addEventListener("keyup", onDocumentKeyUp);
    window.addEventListener("blur", onWindowBlur);

    return () => {
      document.removeEventListener("keydown", onDocumentKeyDown);
      document.removeEventListener("keyup", onDocumentKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [dispatch, world.id]);

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
    // Note: Key tracking for game state is handled by document-level listeners
    // in the useEffect above, so we don't need to dispatch here
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes("handle")) {
      onUpdateHandle(event);
    }
  };

  const onDrop = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("sprite")) {
      onDropSprite(event);
    }
    if (event.dataTransfer.types.includes("appearance")) {
      onDropAppearance(event);
    }
    if (event.dataTransfer.types.includes("handle")) {
      onUpdateHandle(event);
    }
  };

  const onUpdateHandle = (event: React.DragEvent) => {
    const side = event.dataTransfer.types
      .find((t) => t.startsWith("handle:"))!
      .split(":")
      .pop();
    const stageOffset = el.current!.getBoundingClientRect();
    const position = {
      x: (event.clientX - stageOffset.left) / STAGE_CELL_SIZE,
      y: (event.clientY - stageOffset.top) / STAGE_CELL_SIZE,
    };

    // expand the extent of the recording rule to reflect this new extent
    const nextExtent = Object.assign({}, recordingExtent);
    if (side === "left") {
      nextExtent.xmin = Math.min(nextExtent.xmax, Math.max(0, Math.round(position.x + 0.25)));
    }
    if (side === "right") {
      nextExtent.xmax = Math.max(
        nextExtent.xmin,
        Math.min(stage.width, Math.round(position.x - 1)),
      );
    }
    if (side === "top") {
      nextExtent.ymin = Math.min(nextExtent.ymax, Math.max(0, Math.round(position.y + 0.25)));
    }
    if (side === "bottom") {
      nextExtent.ymax = Math.max(
        nextExtent.ymin,
        Math.min(stage.height, Math.round(position.y - 1)),
      );
    }

    const str = JSON.stringify(nextExtent);
    if (lastFiredExtent.current === str) {
      return;
    }
    lastFiredExtent.current = str;
    dispatch(setRecordingExtent(nextExtent));
  };

  const getPxOffsetForEvent = (event: MouseEvent | React.MouseEvent | React.DragEvent) => {
    const stageOffset = el.current!.getBoundingClientRect();
    return { left: event.clientX - stageOffset.left, top: event.clientY - stageOffset.top };
  };

  const getPositionForEvent = (event: MouseEvent | React.MouseEvent | React.DragEvent) => {
    const dragOffset =
      "dataTransfer" in event && event.dataTransfer && event.dataTransfer.getData("drag-offset");

    // subtracting half when no offset is present is a lazy way of doing Math.floor instead of Math.round!
    const halfOffset = { dragTop: STAGE_CELL_SIZE / 2, dragLeft: STAGE_CELL_SIZE / 2 };
    const { dragLeft, dragTop } = dragOffset ? JSON.parse(dragOffset) : halfOffset;

    const px = getPxOffsetForEvent(event);
    return {
      x: Math.round((px.left - dragLeft) / STAGE_CELL_SIZE / scale),
      y: Math.round((px.top - dragTop) / STAGE_CELL_SIZE / scale),
    };
  };

  const onDropAppearance = (event: React.DragEvent) => {
    const { appearance, characterId } = JSON.parse(event.dataTransfer.getData("appearance"));
    const position = getPositionForEvent(event);
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }
    const actor = Object.values(stage.actors).find(
      (a) => actorFillsPoint(a, characters, position) && a.characterId === characterId,
    );
    if (actor) {
      dispatch(changeActors(selFor([actor.id]), { appearance }));
    }
  };

  const onDropActorsAtPosition = (
    { actorIds, dragAnchorActorId }: { actorIds: string[]; dragAnchorActorId: string },
    position: Position,
    mode: "stamp-copy" | "move",
  ) => {
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }

    const anchorActor = stage.actors[dragAnchorActorId];
    const anchorCharacter = characters[anchorActor.characterId];

    applyAnchorAdjustment(position, anchorCharacter, anchorActor);

    const offsetX = position.x - anchorActor.position.x;
    const offsetY = position.y - anchorActor.position.y;

    if (offsetX === 0 && offsetY === 0) {
      // attempting to drop in the same place we started the drag, don't do anything
      return;
    }

    if (mode === "stamp-copy") {
      const creates = actorIds
        .map((aid) => {
          const actor = stage.actors[aid];
          const character = characters[actor.characterId];
          const clonedActor = Object.assign({}, actor, {
            position: {
              x: actor.position.x + offsetX,
              y: actor.position.y + offsetY,
            },
          });
          const clonedActorPoints = actorFilledPoints(clonedActor, characters).map(
            (p) => `${p.x},${p.y}`,
          );

          // If there is an exact copy of this actor that overlaps this position already, don't
          // drop. It's probably a mistake, and you can override by dropping elsewhere and then
          // dragging it to this square.
          const positionContainsCloneAlready = Object.values(stage.actors).find(
            (a) =>
              a.characterId === actor.characterId &&
              a.appearance === actor.appearance &&
              actorFilledPoints(a, characters).some((p) =>
                clonedActorPoints.includes(`${p.x},${p.y}`),
              ),
          );
          if (positionContainsCloneAlready) {
            return;
          }
          return { character, initialValues: clonedActor };
        })
        .filter((c): c is NonNullable<typeof c> => !!c);

      dispatch(createActors(world.id, stage.id, creates));
    } else if (mode === "move") {
      const upserts = actorIds.map((aid) => ({
        id: aid,
        values: {
          position: {
            x: stage.actors[aid].position.x + offsetX,
            y: stage.actors[aid].position.y + offsetY,
          },
        },
      }));
      dispatch(changeActorsIndividually(world.id, stage.id, upserts));
    } else {
      throw new Error("Invalid mode");
    }
  };

  const onDropCharacterAtPosition = (
    { characterId, appearanceId }: { characterId: string; appearanceId?: string },
    position: Position,
  ) => {
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }

    const character = characters[characterId];
    const appearance = appearanceId ?? defaultAppearanceId(character.spritesheet);
    const newActor = { position, appearance } as Actor;
    applyAnchorAdjustment(position, character, newActor);

    const newActorPoints = actorFilledPoints(newActor, characters).map((p) => `${p.x},${p.y}`);

    const positionContainsCloneAlready = Object.values(stage.actors).find(
      (a) =>
        a.characterId === characterId &&
        actorFilledPoints(a, characters).some((p) => newActorPoints.includes(`${p.x},${p.y}`)),
    );
    if (positionContainsCloneAlready) {
      return;
    }
    dispatch(createActors(world.id, stage.id, [{ character, initialValues: newActor }]));
  };

  const onDropSprite = (event: React.DragEvent) => {
    const ids: { actorIds: string[]; dragAnchorActorId: string } | { characterId: string } =
      JSON.parse(event.dataTransfer.getData("sprite"));
    const position = getPositionForEvent(event);
    if ("actorIds" in ids) {
      onDropActorsAtPosition(ids, position, event.altKey ? "stamp-copy" : "move");
    } else if (ids.characterId) {
      onDropCharacterAtPosition(ids, position);
    }
  };

  const onStampAtPosition = (position: Position) => {
    const item = stampToolItem;
    if (item && "actorIds" in item && item.actorIds) {
      const ids = { actorIds: item.actorIds, dragAnchorActorId: item.actorIds[0] };
      onDropActorsAtPosition(ids, position, "stamp-copy");
    } else if (item && "characterId" in item) {
      onDropCharacterAtPosition(item, position);
    }
  };

  const onMouseUpActor = (actor: Actor, event: React.MouseEvent) => {
    let handled = false;

    // Helper to check for overlapping actors and show popover if needed
    const showPopoverIfOverlapping = (toolId: string): boolean => {
      const overlapping = actorsAtPoint(stage.actors, characters, actor.position);
      if (overlapping.length > 1) {
        setActorSelectionPopover({
          actors: overlapping,
          position: { x: event.clientX, y: event.clientY },
          toolId,
        });
        return true;
      }
      return false;
    };

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
          dispatch(recordInputForGameState(world.id, { clicks: { [actor.id]: true } }));
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
      setSelectionRect({ start: getPxOffsetForEvent(event), end: getPxOffsetForEvent(event) });
    } else {
      setSelectionRect(null);
    }
  };

  // Note: In this handler, the mouse cursor may be outside the stage
  const onMouseMove = useRef<(event: MouseEvent) => void>();
  onMouseMove.current = (event: MouseEvent) => {
    if (!mouse.current.isDown) {
      return;
    }

    // If we are dragging to select a region, update the region.
    // Otherwise, process this event as a tool stroke.
    if (selectionRect) {
      setSelectionRect({ ...selectionRect, end: getPxOffsetForEvent(event) });
      return;
    }

    const { x, y } = getPositionForEvent(event);
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
      onStampAtPosition({ x, y });
    }
    if (selectedToolId === TOOLS.TRASH) {
      // If popover is open, skip - we're waiting for user to pick from the popover
      if (actorSelectionPopover) {
        return;
      }

      const overlapping = actorsAtPoint(stage.actors, characters, { x, y });

      // On initial click (not drag), show popover if multiple actors overlap
      const isFirstClick = Object.keys(mouse.current.visited).length === 1;
      if (isFirstClick && overlapping.length > 1) {
        setActorSelectionPopover({
          actors: overlapping,
          position: { x: event.clientX, y: event.clientY },
          toolId: TOOLS.TRASH,
        });
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
  const onMouseUp = useRef<(event: MouseEvent) => void>();
  onMouseUp.current = (event: MouseEvent) => {
    onMouseMove.current?.(event);

    mouse.current = { isDown: false, visited: {} };

    if (selectionRect) {
      const selectedActors: Actor[] = [];
      const [minLeft, maxLeft] = [selectionRect.start.left, selectionRect.end.left].sort(
        (a, b) => a - b,
      );
      const [minTop, maxTop] = [selectionRect.start.top, selectionRect.end.top].sort(
        (a, b) => a - b,
      );
      const min = {
        x: Math.floor(minLeft / STAGE_CELL_SIZE / scale),
        y: Math.floor(minTop / STAGE_CELL_SIZE / scale),
      };
      const max = {
        x: Math.floor(maxLeft / STAGE_CELL_SIZE / scale),
        y: Math.floor(maxTop / STAGE_CELL_SIZE / scale),
      };
      for (const actor of Object.values(stage.actors)) {
        if (
          actor.position.x >= min.x &&
          actor.position.x <= max.x &&
          actor.position.y >= min.y &&
          actor.position.y <= max.y
        ) {
          selectedActors.push(actor);
        }
      }
      const characterId =
        selectedActors.length &&
        selectedActors.every((a) => a.characterId === selectedActors[0].characterId)
          ? selectedActors[0].characterId
          : null;
      dispatch(select(characterId, selFor(selectedActors.map((a) => a.id))));
      setSelectionRect(null);
    }
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
    if (!actorSelectionPopover) return;

    const { toolId } = actorSelectionPopover;

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

    setActorSelectionPopover(null);
  };

  const onPopoverDragStart = () => {
    // Close the popover when drag starts - the drag will continue to the stage
    setActorSelectionPopover(null);
  };

  const onPopoverClose = () => {
    setActorSelectionPopover(null);
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
      <div style={style} ref={(el) => (scrollEl.current = el)} className="stage-scroll-wrap" />
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
      Math.abs(lastPosition.x - actor.position.x) > 6 ||
      Math.abs(lastPosition.y - actor.position.y) > 6;
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
      ref={(e) => (scrollEl.current = e)}
      data-stage-wrap-id={world.id}
      data-stage-zoom={scale}
      className={`stage-scroll-wrap tool-supported running-${playback.running}`}
    >
      <div
        ref={(e) => (el.current = e)}
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
        onDragOver={onDragOver}
        onDrop={onDrop}
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
            filter: "brightness(0.8) saturate(0.8)",
          }}
        />

        {Object.values(stage.actors).map(renderActor)}

        {recordingExtent ? renderRecordingExtent() : []}
      </div>
      {selectionRect ? (
        <div
          className="stage-selection-box"
          style={{
            position: "absolute",
            left: Math.min(selectionRect.start.left, selectionRect.end.left),
            top: Math.min(selectionRect.start.top, selectionRect.end.top),
            width:
              Math.max(selectionRect.start.left, selectionRect.end.left) -
              Math.min(selectionRect.start.left, selectionRect.end.left),
            height:
              Math.max(selectionRect.start.top, selectionRect.end.top) -
              Math.min(selectionRect.start.top, selectionRect.end.top),
          }}
        />
      ) : null}
      {actorSelectionPopover && (
        <ActorSelectionPopover
          actors={actorSelectionPopover.actors}
          characters={characters}
          position={actorSelectionPopover.position}
          onSelect={onPopoverSelectActor}
          onDragStart={onPopoverDragStart}
          onClose={onPopoverClose}
        />
      )}
    </div>
  );
};

export default Stage;

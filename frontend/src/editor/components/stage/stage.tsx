import React, { CSSProperties, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import ActorSprite from "../sprites/actor-sprite";
import RecordingHandle from "../sprites/recording-handle";
import RecordingIgnoredSprite from "../sprites/recording-ignored-sprite";
import RecordingMaskSprite from "../sprites/recording-mask-sprite";

import {
  setRecordingExtent,
  setupRecordingForActor,
  toggleSquareIgnored,
  upsertRecordingCondition,
} from "../../actions/recording-actions";
import {
  changeActor,
  createActor,
  deleteActor,
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
  actorFilledPoints,
  actorFillsPoint,
  applyAnchorAdjustment,
  buildActorPath,
  pointIsOutside,
} from "../../utils/stage-helpers";

import {
  Actor,
  Characters,
  EditorState,
  Position,
  RuleExtent,
  Stage as StageType,
  UIState,
  WorldMinimal,
} from "../../../types";
import { defaultAppearanceId } from "../../utils/character-helpers";
import { makeId } from "../../utils/utils";
import { keyToCodakoKey } from "../modal-keypicker/keyboard";

interface StageProps {
  stage: StageType;
  world: WorldMinimal;
  recordingExtent?: RuleExtent;
  recordingCentered?: boolean;
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

  const lastFiredExtent = useRef<string | null>(null);
  const lastActorPositions = useRef<{ [actorId: string]: Position }>({});

  const mouse = useRef<MouseStatus>({ isDown: false, visited: {} });
  const scrollEl = useRef<HTMLDivElement | null>();
  const el = useRef<HTMLDivElement | null>();

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
  const characters = useSelector<EditorState, Characters>((state) => state.characters);
  const { selectedActorPath, selectedToolId, stampToolItem, playback } = useSelector<
    EditorState,
    Pick<UIState, "selectedActorPath" | "selectedToolId" | "stampToolItem" | "playback">
  >((state) => ({
    selectedActorPath: state.ui.selectedActorPath,
    selectedToolId: state.ui.selectedToolId,
    stampToolItem: state.ui.stampToolItem,
    playback: state.ui.playback,
  }));

  // Helpers

  const actorPath = (actorId: string) => {
    return buildActorPath(world.id, stage.id, actorId);
  };

  const stagePath = () => {
    return { stageId: stage.id, worldId: world.id };
  };

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

  const onBlur = () => {
    if (playback.running) {
      el.current?.focus();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      // do not catch these events, they're probably actual hotkeys
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.key === "Delete" || event.key === "Backspace") {
      if (selectedActorPath.worldId === world.id) {
        dispatch(deleteActor(selectedActorPath));
      }
      return;
    }

    dispatch(recordKeyForGameState(world.id, keyToCodakoKey(`${event.key}`)));
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

  const getPositionForPxOffset = ({ left, top }: { left: number; top: number }) => {
    return {
      x: Math.round(left / STAGE_CELL_SIZE / scale),
      y: Math.round(top / STAGE_CELL_SIZE / scale),
    };
  };
  const getPositionForEvent = (event: MouseEvent | React.MouseEvent | React.DragEvent) => {
    const dragOffset =
      "dataTransfer" in event && event.dataTransfer && event.dataTransfer.getData("drag-offset");

    // subtracting half when no offset is present is a lazy way of doing Math.floor instead of Math.round!
    const halfOffset = { dragTop: STAGE_CELL_SIZE / 2, dragLeft: STAGE_CELL_SIZE / 2 };
    const { dragLeft, dragTop } = dragOffset ? JSON.parse(dragOffset) : halfOffset;

    const px = getPxOffsetForEvent(event);
    return getPositionForPxOffset({ left: px.left - dragLeft, top: px.top - dragTop });
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
      dispatch(changeActor(actorPath(actor.id), { appearance }));
    }
  };

  const onDropActorAtPosition = (
    { actorId }: { actorId: string },
    position: Position,
    mode: "stamp-copy" | "move",
  ) => {
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }

    const actor = stage.actors[actorId];
    const character = characters[actor.characterId];

    applyAnchorAdjustment(position, character, actor);

    if (actor.position.x === position.x && actor.position.y === position.y) {
      // attempting to drop in the same place we started the drag, don't do anything
      return;
    }

    if (mode === "stamp-copy") {
      const clonedActor = Object.assign({}, actor, { position });
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
          actorFilledPoints(a, characters).some((p) => clonedActorPoints.includes(`${p.x},${p.y}`)),
      );
      if (positionContainsCloneAlready) {
        return;
      }
      dispatch(createActor(stagePath(), character, clonedActor));
    } else if (mode === "move") {
      dispatch(changeActor(actorPath(actorId), { position }));
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
    dispatch(createActor(stagePath(), character, newActor));
  };

  const onDropSprite = (event: React.DragEvent) => {
    const { actorId, characterId } = JSON.parse(event.dataTransfer.getData("sprite"));
    const position = getPositionForEvent(event);
    if (actorId) {
      onDropActorAtPosition({ actorId }, position, event.altKey ? "stamp-copy" : "move");
    } else if (characterId) {
      onDropCharacterAtPosition({ characterId }, position);
    }
  };

  const onStampAtPosition = (position: Position) => {
    if (stampToolItem && "actorId" in stampToolItem && stampToolItem.actorId) {
      onDropActorAtPosition({ actorId: stampToolItem.actorId }, position, "stamp-copy");
    } else if (stampToolItem && "characterId" in stampToolItem) {
      onDropCharacterAtPosition(stampToolItem, position);
    }
  };

  const onMouseUpActor = (actor: Actor, event: React.MouseEvent) => {
    let handled = false;

    switch (selectedToolId) {
      case TOOLS.PAINT:
        dispatch(paintCharacterAppearance(actor.characterId, actor.appearance));
        handled = true;
        break;
      case TOOLS.STAMP:
        if (!stampToolItem) {
          dispatch(selectToolItem(actorPath(actor.id)));
          handled = true;
        }
        break;
      case TOOLS.RECORD:
        dispatch(setupRecordingForActor({ characterId: actor.characterId, actor }));
        dispatch(selectToolId(TOOLS.POINTER));
        handled = true;
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
        handled = true;
        break;
      case TOOLS.POINTER:
        if (playback.running) {
          dispatch(recordClickForGameState(world.id, actor.id));
        } else {
          onSelectActor(actor);
        }
        handled = true;
        break;
    }

    // If we didn't handle the event, let it bubble up to the stage onClick handler

    if (handled) {
      event.stopPropagation();
    }
  };

  const onMouseDown = (event: React.MouseEvent) => {
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
      const actor = Object.values(stage.actors)
        .reverse()
        .find((a) => actorFillsPoint(a, characters, { x, y }));
      if (actor) {
        dispatch(deleteActor(actorPath(actor.id)));
      }
    }
  };

  // Note: In this handler, the mouse cursor may be outside the stage
  const onMouseUp = useRef<(event: MouseEvent) => void>();
  onMouseUp.current = (event: MouseEvent) => {
    mouse.current = { isDown: false, visited: {} };

    onMouseMove.current?.(event);

    if (selectionRect) {
      const selectedActors: Actor[] = [];
      const a = getPositionForPxOffset(selectionRect.start);
      const b = getPositionForPxOffset(selectionRect.end);
      const minX = Math.min(a.x, b.x);
      const maxX = Math.max(a.x, b.x);
      const minY = Math.min(a.y, b.y);
      const maxY = Math.max(a.y, b.y);
      for (const actor of Object.values(stage.actors)) {
        if (
          actor.position.x >= minX &&
          actor.position.x <= maxX &&
          actor.position.y >= minY &&
          actor.position.y <= maxY
        ) {
          selectedActors.push(actor);
        }
      }
      if (selectedActors.length === 1) {
        onSelectActor(selectedActors[0]);
      }
      setSelectionRect(null);
    }
    if (!event.shiftKey) {
      if (TOOLS.TRASH === selectedToolId || TOOLS.STAMP === selectedToolId) {
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
      dispatch(select(actor.characterId, actorPath(actor.id)));
    }
  };

  const renderRecordingExtent = () => {
    const { width, height } = stage;
    if (!recordingExtent) {
      return [];
    }

    const components = [];
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

  let selected = null;
  if (
    selectedActorPath.worldId === world.id &&
    selectedActorPath.stageId === stage.id &&
    selectedActorPath.actorId
  ) {
    selected = stage.actors[selectedActorPath.actorId];
  }

  const backgroundValue =
    typeof stage.background === "string"
      ? stage.background.includes("/Layer0_2.png")
        ? `url(${new URL(`/src/editor/img/backgrounds/Layer0_2.png`, import.meta.url).href})`
        : stage.background
      : "";

  // linear gradient to blur cover the background image
  const backgroundCSS = `url('/src/editor/img/board-grid.png') top left / 40px,
    linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)),
    ${backgroundValue}${backgroundValue?.includes("url(") ? " 50% 50% / cover" : ""}`;

  return (
    <div
      style={style}
      ref={(e) => (scrollEl.current = e)}
      data-stage-wrap-id={world.id}
      className={`stage-scroll-wrap tool-${selectedToolId} running-${playback.running}`}
    >
      <div
        ref={(e) => (el.current = e)}
        style={{
          top,
          left,
          width: stage.width * STAGE_CELL_SIZE,
          height: stage.height * STAGE_CELL_SIZE,
          overflow: recordingExtent ? "visible" : "hidden",
          zoom: scale,
        }}
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
            filter: "brightness(1) saturate(0.8)",
          }}
        />
        {Object.values(stage.actors).map((actor) => {
          const character = characters[actor.characterId];

          const lastPosition = lastActorPositions.current[actor.id] || {
            x: Number.NaN,
            y: Number.NaN,
          };
          const didWrap =
            Math.abs(lastPosition.x - actor.position.x) > 6 ||
            Math.abs(lastPosition.y - actor.position.y) > 6;
          lastActorPositions.current[actor.id] = Object.assign({}, actor.position);

          return (
            <ActorSprite
              draggable={!readonly && !DRAGGABLE_TOOLS.includes(selectedToolId)}
              key={`${actor.id}-${didWrap}`}
              selected={actor === selected}
              onMouseUp={(event) => onMouseUpActor(actor, event)}
              onDoubleClick={() => onSelectActor(actor)}
              transitionDuration={playback.speed / (actor.frameCount || 1)}
              character={character}
              actor={actor}
            />
          );
        })}
        {recordingExtent ? renderRecordingExtent() : []}
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
      </div>
    </div>
  );
};

export default Stage;

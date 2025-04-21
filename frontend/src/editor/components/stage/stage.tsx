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
  World,
} from "../../../types";

interface StageProps {
  recordingExtent: RuleExtent;
  recordingCentered?: boolean;
  stage: StageType;
  world: World;
  readonly?: boolean;
  style?: CSSProperties;
}

type Offset = { top: string | number; left: string | number };
type MouseStatus = { isDown: boolean; visited: { [posKey: string]: true } };

const DRAGGABLE_TOOLS = [TOOLS.IGNORE_SQUARE, TOOLS.TRASH, TOOLS.STAMP];

export const Stage = ({
  recordingExtent,
  recordingCentered,
  stage,
  world,
  readonly,
  style,
}: StageProps) => {
  const [{ top, left }, setOffset] = useState<Offset>({ top: 0, left: 0 });
  const lastFiredExtent = useRef<string | null>(null);
  const lastActorPositions = useRef<{ [actorId: string]: Position }>({});

  const mouse = useRef<MouseStatus>({ isDown: false, visited: {} });
  const scrollEl = useRef<HTMLDivElement | null>();
  const el = useRef<HTMLDivElement | null>();

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

    if (event.keyCode === 127 || event.keyCode === 8) {
      if (selectedActorPath.worldId === world.id) {
        dispatch(deleteActor(selectedActorPath));
      }
      return;
    }

    dispatch(recordKeyForGameState(world.id, `${event.keyCode}`));
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

  const getPositionForEvent = (event: React.MouseEvent | React.DragEvent) => {
    const stageOffset = el.current!.getBoundingClientRect();
    const dragOffset =
      "dataTransfer" in event && event.dataTransfer && event.dataTransfer.getData("drag-offset");

    // subtracting half when no offset is present is a lazy way of doing Math.floor instead of Math.round!
    const halfOffset = {
      dragTop: STAGE_CELL_SIZE / 2,
      dragLeft: STAGE_CELL_SIZE / 2,
    };
    const { dragLeft, dragTop } = dragOffset ? JSON.parse(dragOffset) : halfOffset;
    return {
      x: Math.round((event.clientX - dragLeft - stageOffset.left) / STAGE_CELL_SIZE),
      y: Math.round((event.clientY - dragTop - stageOffset.top) / STAGE_CELL_SIZE),
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
      dispatch(changeActor(actorPath(actor.id), { appearance }));
    }
  };

  const onDropActorAtPosition = (
    { actorId, characterId }: { actorId?: string; characterId?: string },
    position: Position,
    clone = false,
  ) => {
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }

    if (actorId) {
      const actor = stage.actors[actorId];
      const character = characters[actor.characterId];

      applyAnchorAdjustment(position, character, actor);

      if (actor.position.x === position.x && actor.position.y === position.y) {
        // attempting to drop in the same place we started the drag, don't do anything
        return;
      }

      if (clone) {
        // If there is an exact copy of this actor at this position already, don't drop.
        // It's probably a mistake, and you can override by dropping elsewhere and then
        // dragging it to this square.
        const exact = Object.values(stage.actors).find(
          (a) =>
            actorFillsPoint(a, characters, position) &&
            a.characterId === actor.characterId &&
            a.appearance === actor.appearance,
        );
        if (exact) {
          return;
        }
        const clonedActor = Object.assign({}, actor, { position });
        dispatch(createActor(stagePath(), character, clonedActor));
      } else {
        dispatch(changeActor(actorPath(actorId), { position }));
      }
    } else if (characterId) {
      const character = characters[characterId];

      applyAnchorAdjustment(position, character, { appearance: "default" });

      const exact = Object.values(stage.actors).find(
        (a) => actorFillsPoint(a, characters, position) && a.characterId === characterId,
      );
      if (exact) {
        return;
      }
      dispatch(createActor(stagePath(), character, { position }));
    }
  };

  const onDropSprite = (event: React.DragEvent) => {
    const { actorId, characterId } = JSON.parse(event.dataTransfer.getData("sprite"));
    const position = getPositionForEvent(event);
    onDropActorAtPosition({ actorId, characterId }, position, event.altKey);
  };

  const onStampAtPosition = (position: Position) => {
    if (stampToolItem && "actorId" in stampToolItem && stampToolItem.actorId) {
      onDropActorAtPosition({ actorId: stampToolItem.actorId }, position, true);
    } else if (stampToolItem && "characterId" in stampToolItem) {
      onDropActorAtPosition({ characterId: stampToolItem.characterId }, position, true);
    }
  };

  const onClickActor = (actor: Actor, event: React.MouseEvent) => {
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
      case TOOLS.POINTER:
        dispatch(recordClickForGameState(world.id, actor.id));
        handled = true;
        break;
    }

    // If we didn't handle the event, let it bubble up to the stage onClick handler

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onMouseDown = () => {
    const onEnd = () => {
      document.removeEventListener("mouseup", onEnd);
      mouse.current = { isDown: false, visited: {} };
    };
    document.addEventListener("mouseup", onEnd);
    mouse.current = { isDown: true, visited: {} };
  };

  const onMouseMove = (event: React.MouseEvent) => {
    if (!mouse.current.isDown) {
      return;
    }
    const { x, y } = getPositionForEvent(event);
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

  const onMouseUp = (event: React.MouseEvent) => {
    onMouseMove(event);
    if (!event.shiftKey) {
      if (TOOLS.TRASH === selectedToolId || (TOOLS.STAMP === selectedToolId && stampToolItem)) {
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
    const { xmin, xmax, ymin, ymax } = recordingExtent;

    const components = [];

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

  const backgroundCSS = `url('/src/editor/img/board-grid.png') top left / 40px,
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
        style={{ top, left }}
        className="stage"
        onDragOver={onDragOver}
        onDrop={onDrop}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onContextMenu={onRightClickStage}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        tabIndex={0}
      >
        <div
          className="background"
          style={{
            position: "absolute",
            width: stage.width * STAGE_CELL_SIZE,
            height: stage.height * STAGE_CELL_SIZE,
            background: backgroundCSS,
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

          const isToolItem =
            stampToolItem && "actorId" in stampToolItem && actor.id === stampToolItem.actorId;

          return (
            <ActorSprite
              draggable={!readonly && !DRAGGABLE_TOOLS.includes(selectedToolId)}
              toolItem={!!isToolItem}
              key={`${actor.id}-${didWrap}`}
              selected={actor === selected}
              onClick={(event) => onClickActor(actor, event)}
              onDoubleClick={() => onSelectActor(actor)}
              transitionDuration={playback.speed}
              character={character}
              actor={actor}
            />
          );
        })}
        {recordingExtent ? renderRecordingExtent() : []}
      </div>
    </div>
  );
};

export default Stage;

import { Actor, Character } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import {
  pointApplyingTransform,
  renderTransformedImage,
  transformSwapsDimensions,
} from "../../utils/stage-helpers";
import { createActorSpriteData } from "../stage/hooks";
import VariableOverlay from "../modal-paint/variable-overlay";
import { DEFAULT_APPEARANCE_INFO, SPRITE_TRANSFORM_CSS } from "./sprite";

const MISSING_CHARACTER_QUESTION_MARK = `data:image/png;base64,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`;

const ActorSprite = (props: {
  character: Character;
  actor: Actor;
  selected?: boolean;
  dragActorIds?: string[];
  onClick?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  transitionDuration?: number;
}) => {
  const {
    actor,
    character,
    selected,
    dragActorIds,
    transitionDuration,
    onClick,
    onMouseUp,
    onDoubleClick,
    onDragStart: onDragStartProp,
  } = props;

  if (!character) {
    return (
      <div
        title="This character has been removed and this rule will not execute."
        style={{
          position: "absolute",
          zIndex: selected ? 2 : undefined,
          transitionDuration: `${transitionDuration}ms`,
          left: actor.position.x * STAGE_CELL_SIZE,
          top: actor.position.y * STAGE_CELL_SIZE,
          width: STAGE_CELL_SIZE,
          height: STAGE_CELL_SIZE,
          background: `url(${MISSING_CHARACTER_QUESTION_MARK})`,
        }}
      ></div>
    );
  }

  const { appearances, appearanceInfo } = character.spritesheet;
  const info = appearanceInfo?.[actor.appearance] || DEFAULT_APPEARANCE_INFO;

  const isEventInFilledSquare = (event: React.DragEvent | React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) {
      return false;
    }
    const { top, left } = event.target.getBoundingClientRect();

    const [cellX, cellY] = pointApplyingTransform(
      Math.floor((event.clientX - left) / 40),
      Math.floor((event.clientY - top) / 40),
      info,
      actor.transform,
    );
    if (info && !info.filled[`${cellX},${cellY}`]) {
      event.preventDefault();
      return false;
    }
    return true;
  };

  const onDragStart = (event: React.DragEvent) => {
    if (!dragActorIds) {
      event.preventDefault();
      return;
    }
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (!isEventInFilledSquare(event)) {
      return;
    }

    const { top, left } = event.target.getBoundingClientRect();
    const dragLeft = event.clientX - left;
    const dragTop = event.clientY - top;

    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData(
      "drag-offset",
      JSON.stringify({
        dragLeft,
        dragTop,
      }),
    );
    event.dataTransfer.setData(
      "sprite",
      createActorSpriteData(dragActorIds, actor.id),
    );

    // Create a properly transformed drag image using canvas
    // This fixes garbled appearance when dragging rotated/flipped actors
    const imgEl =
      event.target.tagName === "IMG"
        ? (event.target as HTMLImageElement)
        : event.target.querySelector("img");

    if (imgEl) {
      const transform = actor.transform ?? "0";
      const imgWidth = imgEl.naturalWidth || imgEl.width;
      const imgHeight = imgEl.naturalHeight || imgEl.height;

      const canvas = renderTransformedImage(imgEl, imgWidth, imgHeight, transform);
      const dragImage = new Image();
      dragImage.src = canvas.toDataURL();

      // Adjust drag offset for rotated images where dimensions are swapped
      let adjustedDragLeft = dragLeft;
      let adjustedDragTop = dragTop;
      if (transformSwapsDimensions(transform)) {
        if (transform === "90") {
          adjustedDragLeft = dragTop;
          adjustedDragTop = imgWidth - dragLeft;
        } else if (transform === "270") {
          adjustedDragLeft = imgHeight - dragTop;
          adjustedDragTop = dragLeft;
        } else if (transform === "d1") {
          adjustedDragLeft = dragTop;
          adjustedDragTop = dragLeft;
        } else if (transform === "d2") {
          adjustedDragLeft = imgHeight - dragTop;
          adjustedDragTop = imgWidth - dragLeft;
        }
      }

      event.dataTransfer.setDragImage(dragImage, adjustedDragLeft, adjustedDragTop);
    }

    onDragStartProp?.(event);
  };

  let data = new URL("../../img/splat.png", import.meta.url).href;
  if (appearances[actor.appearance]) {
    data = appearances[actor.appearance][0];
  }

  const variableOverlay = info.variableOverlay || { showVariables: false, visibleVariables: {} };
  const shouldShowVariables = Object.keys(variableOverlay.visibleVariables).some(
    (key) => variableOverlay.visibleVariables[key],
  );

  return (
    <div
      className="animated"
      style={{
        position: "absolute",
        zIndex: selected ? 2 : undefined,
        transitionDuration: `${transitionDuration}ms`,
        left: (actor.position.x - info.anchor.x) * STAGE_CELL_SIZE,
        top: (actor.position.y - info.anchor.y) * STAGE_CELL_SIZE,
        pointerEvents: "none",
      }}
    >
      <img
        draggable={!!dragActorIds}
        data-stage-character-id={character.id}
        onDragStart={(event) => {
          if (isEventInFilledSquare(event)) {
            onDragStart(event);
          }
        }}
        onMouseUp={(event) => {
          if (isEventInFilledSquare(event)) {
            onMouseUp?.(event);
          }
        }}
        onClick={(event) => {
          if (isEventInFilledSquare(event)) {
            onClick?.(event);
          }
        }}
        onDoubleClick={(event) => {
          if (isEventInFilledSquare(event)) {
            onDoubleClick?.(event);
          }
        }}
        src={data}
        className={`sprite ${selected ? "outlined" : ""}`}
        style={{
          transform: SPRITE_TRANSFORM_CSS[actor.transform ?? "0"],
          transformOrigin: `${((info.anchor.x + 0.5) / info.width) * 100}% ${((info.anchor.y + 0.5) / info.height) * 100}%`,
          transitionProperty: "transform",
          transitionDuration: `${transitionDuration}ms`,
          pointerEvents: "auto",
        }}
      />
      {shouldShowVariables && (
        <VariableOverlay
          character={character}
          actor={actor}
          showVariables={true}
          visibleVariables={variableOverlay.visibleVariables}
          pixelSize={1}
          imageData={{
            width: info.width * STAGE_CELL_SIZE,
            height: info.height * STAGE_CELL_SIZE,
          }}
          stageContext={true}
        />
      )}
    </div>
  );
};

export default ActorSprite;

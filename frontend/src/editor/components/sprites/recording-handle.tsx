import React, { useRef } from "react";
import { Position } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";

export type RecordingHandleSide = "top" | "bottom" | "left" | "right";

// How far the invisible hit area reaches past the handle's own square, in cells.
// It grows along the edge and outward (away from the rule's extent), never
// inward, so it only covers masked squares and never blocks actors in the rule.
const HIT_ALONG = 0.5;
const HIT_OUTWARD = 0.5;

const HIT_AREA_INSETS: { [side in RecordingHandleSide]: React.CSSProperties } = {
  top: {
    left: -HIT_ALONG * STAGE_CELL_SIZE,
    right: -HIT_ALONG * STAGE_CELL_SIZE,
    top: -HIT_OUTWARD * STAGE_CELL_SIZE,
    bottom: 0,
  },
  bottom: {
    left: -HIT_ALONG * STAGE_CELL_SIZE,
    right: -HIT_ALONG * STAGE_CELL_SIZE,
    top: 0,
    bottom: -HIT_OUTWARD * STAGE_CELL_SIZE,
  },
  left: {
    left: -HIT_OUTWARD * STAGE_CELL_SIZE,
    right: 0,
    top: -HIT_ALONG * STAGE_CELL_SIZE,
    bottom: -HIT_ALONG * STAGE_CELL_SIZE,
  },
  right: {
    left: 0,
    right: -HIT_OUTWARD * STAGE_CELL_SIZE,
    top: -HIT_ALONG * STAGE_CELL_SIZE,
    bottom: -HIT_ALONG * STAGE_CELL_SIZE,
  },
};

const RecordingHandle = ({
  side,
  position,
  onDrag,
}: {
  side: RecordingHandleSide;
  position: Position;
  // Called with where the center of the handle's square should be, in client px.
  onDrag: (side: RecordingHandleSide, clientX: number, clientY: number) => void;
}) => {
  // Pointer events (not HTML5 drag and drop) so a touch drags right away
  // instead of needing a long-press, and mouse, touch and pen share one path.
  // The offset from the handle's center to where it was grabbed keeps the
  // extent from jumping when the drag starts anywhere in the hit area.
  const grab = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    // Also suppresses the compatibility mousedown, so the stage doesn't start
    // a selection rectangle underneath the drag.
    event.preventDefault();
    event.stopPropagation();
    const square = event.currentTarget.parentElement!.getBoundingClientRect();
    grab.current = {
      pointerId: event.pointerId,
      dx: event.clientX - (square.left + square.width / 2),
      dy: event.clientY - (square.top + square.height / 2),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!grab.current || grab.current.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    onDrag(side, event.clientX - grab.current.dx, event.clientY - grab.current.dy);
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (grab.current?.pointerId === event.pointerId) {
      grab.current = null;
    }
  };

  return (
    <div
      data-stage-handle={side}
      className={`handle-${side}`}
      style={{
        position: "absolute",
        width: STAGE_CELL_SIZE,
        height: STAGE_CELL_SIZE,
        left: (position.x - 1) * STAGE_CELL_SIZE,
        bottom: (position.y - 1) * STAGE_CELL_SIZE,
        backgroundImage: `url(${new URL(`../../img/tiles/handle_${side}.png`, import.meta.url).href})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        style={{
          position: "absolute",
          ...HIT_AREA_INSETS[side],
          pointerEvents: "auto",
          cursor: side === "left" || side === "right" ? "ew-resize" : "ns-resize",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      />
    </div>
  );
};
export default RecordingHandle;

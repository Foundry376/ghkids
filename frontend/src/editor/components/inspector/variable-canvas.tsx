import React, { useMemo, useRef, useState } from "react";

import { GridPosition } from "../../../types";
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  cellFromPoint,
  getActiveVariableDrag,
  layoutHeight,
  resolveLayout,
} from "../../utils/variable-layout";

// One empty row of slack below the lowest box so a box can always be dragged
// down into a fresh bottom row.
const DROP_BUFFER = CELL_HEIGHT;

type CanvasItem = { id: string; position?: GridPosition };

/**
 * Free-form arrangement surface for one section's user variables. Boxes are
 * absolutely positioned on a 2-column snap grid; dragging a box onto a cell
 * moves it there (swapping with whatever already occupies that cell). Built-in
 * boxes are rendered elsewhere (a pinned header), not here.
 */
export const VariableCanvas = ({
  items,
  kind,
  enabled,
  onMove,
  renderItem,
}: {
  items: CanvasItem[];
  /** Section discriminator; drags from other sections/sources are ignored. */
  kind: "actor" | "global" | "stageVariable";
  /** When false (e.g. readonly recording view) boxes render but don't move. */
  enabled: boolean;
  onMove: (positions: Record<string, GridPosition>) => void;
  renderItem: (id: string, style: React.CSSProperties) => React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [previewCell, setPreviewCell] = useState<GridPosition | null>(null);

  const layout = useMemo(() => resolveLayout(items), [items]);

  // True when the in-flight drag is one of this canvas's own boxes (not a
  // sprite, an Appearance box, a pinned built-in, or another section's box).
  const isOwnDrag = () => {
    const drag = getActiveVariableDrag();
    return !!drag && drag.kind === kind && items.some((it) => it.id === drag.id);
  };

  const cellAtEvent = (event: React.DragEvent): GridPosition | null => {
    if (!ref.current) return null;
    const drag = getActiveVariableDrag()!;
    return cellFromPoint(
      event.clientX,
      event.clientY,
      ref.current.getBoundingClientRect(),
      drag.offsetX,
      drag.offsetY,
    );
  };

  const _onDragOver = (event: React.DragEvent) => {
    if (!enabled || !isOwnDrag() || !event.dataTransfer.types.includes("variable")) return;
    event.preventDefault();
    setPreviewCell(cellAtEvent(event));
  };

  const _onDragLeave = (event: React.DragEvent) => {
    // Ignore leaves into descendant boxes; only clear when leaving the canvas.
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setPreviewCell(null);
  };

  const _onDrop = (event: React.DragEvent) => {
    setPreviewCell(null);
    if (!enabled || !isOwnDrag()) return;

    let payload: { reorderId?: string; reorderKind?: string };
    try {
      payload = JSON.parse(event.dataTransfer.getData("variable"));
    } catch {
      return;
    }
    if (payload.reorderKind !== kind || !payload.reorderId) return;

    const draggedId = payload.reorderId;
    const current = layout.get(draggedId);
    const target = cellAtEvent(event);
    if (!current || !target) return;
    if (target.col === current.col && target.row === current.row) return;

    const occupant = items.find((it) => {
      if (it.id === draggedId) return false;
      const p = layout.get(it.id);
      return p && p.col === target.col && p.row === target.row;
    });

    const positions: Record<string, GridPosition> = { [draggedId]: target };
    if (occupant) positions[occupant.id] = current; // swap into the dragged box's old cell
    onMove(positions);
    event.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="variables-canvas"
      style={{ minHeight: layoutHeight(layout) + DROP_BUFFER }}
      onDragOver={_onDragOver}
      onDragLeave={_onDragLeave}
      onDrop={_onDrop}
    >
      {items.map((item) => {
        const pos = layout.get(item.id)!;
        return (
          <React.Fragment key={item.id}>
            {renderItem(item.id, {
              position: "absolute",
              left: pos.col * CELL_WIDTH,
              top: pos.row * CELL_HEIGHT,
            })}
          </React.Fragment>
        );
      })}
      {previewCell && (
        <div
          className="variable-drop-preview"
          style={{
            left: previewCell.col * CELL_WIDTH,
            top: previewCell.row * CELL_HEIGHT,
            width: BOX_WIDTH,
            height: BOX_HEIGHT,
          }}
        />
      )}
    </div>
  );
};

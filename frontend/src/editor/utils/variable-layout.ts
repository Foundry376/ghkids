import { GridPosition } from "../../types";

// The inspector panel is a fixed 300px wide, which fits exactly two 120px
// variable boxes side by side, so the arrangement canvas is a 2-column grid.
// Positions are stored as { col, row } cell indices (not pixels) so an
// arrangement survives different screen widths and replay on other devices.
export const GRID_COLUMNS = 2;
export const CELL_WIDTH = 135;
export const CELL_HEIGHT = 80;
// The Character tab's Appearance box (sprite dropdown + "Turn…" button) is
// taller than a plain value box, so that tab uses taller rows to keep every
// cell uniform. Positions are stored as row/col indices, so cell height is a
// pure render concern and can differ per section.
export const CHARACTER_CELL_HEIGHT = 96;
// Visual footprint of a single box within its cell (used for the drop preview).
export const BOX_WIDTH = 120;
// Width of the filled columns (last column's left edge + a box). Both the
// pinned header grid and the canvas use this so the block can be centered as a
// unit and the two surfaces keep identical column positions.
export const CONTENT_WIDTH = (GRID_COLUMNS - 1) * CELL_WIDTH + BOX_WIDTH;

export const BUILTIN_GLOBAL_IDS = new Set(["click", "keypress", "selectedStageId", "cameraFollow"]);

// Pseudo-variable ids for the Character tab's built-in boxes (Appearance and
// the actor's position). They aren't entries in `character.variables`, so their
// arrangement is tracked in `character.variableLayout` under these ids, in this
// default reading order.
export const CHARACTER_BUILTIN_VARIABLE_IDS = ["appearance", "x", "y"] as const;

type Positioned = { id: string; position?: GridPosition | null };

const cellKey = (col: number, row: number) => `${col},${row}`;

/**
 * Assigns a concrete { col, row } to every definition. Definitions with a
 * stored position keep it (collisions are bumped to the next free cell);
 * any without one flow into the first free cells in reading order. After the
 * one-time position migration every user variable has a stored position, so
 * the flow path is just a safety net for freshly-loaded/partial states.
 */
export function resolveLayout<T extends Positioned>(defs: T[]): Map<string, GridPosition> {
  const out = new Map<string, GridPosition>();
  const taken = new Set<string>();

  const claim = (id: string, desired: GridPosition) => {
    let col = Math.min(Math.max(desired.col, 0), GRID_COLUMNS - 1);
    let row = Math.max(desired.row, 0);
    while (taken.has(cellKey(col, row))) {
      col += 1;
      if (col >= GRID_COLUMNS) {
        col = 0;
        row += 1;
      }
    }
    taken.add(cellKey(col, row));
    out.set(id, { col, row });
  };

  defs
    .filter((d): d is T & { position: GridPosition } => !!d.position)
    .sort((a, b) => a.position.row - b.position.row || a.position.col - b.position.col)
    .forEach((d) => claim(d.id, d.position));

  let scanCol = 0;
  let scanRow = 0;
  for (const d of defs.filter((d) => !d.position)) {
    while (taken.has(cellKey(scanCol, scanRow))) {
      scanCol += 1;
      if (scanCol >= GRID_COLUMNS) {
        scanCol = 0;
        scanRow += 1;
      }
    }
    claim(d.id, { col: scanCol, row: scanRow });
  }

  return out;
}

/** Total pixel height needed to show every row in a resolved layout. */
export function layoutHeight(
  layout: Map<string, GridPosition>,
  cellHeight: number = CELL_HEIGHT,
): number {
  let maxRow = -1;
  layout.forEach((p) => {
    maxRow = Math.max(maxRow, p.row);
  });
  return (maxRow + 1) * cellHeight;
}

/**
 * Snaps a drop point to the nearest grid cell. `offsetX/Y` is where inside the
 * dragged box the pointer grabbed it, so the box's top-left — not the cursor —
 * drives the landing cell.
 */
export function cellFromPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
  offsetX: number,
  offsetY: number,
  cellHeight: number = CELL_HEIGHT,
): GridPosition {
  const col = Math.round((clientX - rect.left - offsetX) / CELL_WIDTH);
  const row = Math.round((clientY - rect.top - offsetY) / cellHeight);
  return {
    col: Math.min(Math.max(col, 0), GRID_COLUMNS - 1),
    row: Math.max(row, 0),
  };
}

/**
 * Default cell for a newly created variable: bottom-left, one row below the
 * lowest existing one. Built-ins carry no position and so are ignored.
 */
export function nextPosition(items: { position?: GridPosition | null }[]): GridPosition {
  const rows = items
    .map((i) => i.position?.row)
    .filter((r): r is number => typeof r === "number");
  return { col: 0, row: rows.length ? Math.max(...rows) + 1 : 0 };
}

// Shared, single-drag state so the canvas can read the grab offset (not
// available from the dataTransfer during dragover) and ignore drags that
// didn't originate from a same-section variable box (e.g. Appearance, sprites).
type ActiveVariableDrag = { id: string; kind: string; offsetX: number; offsetY: number };
let activeVariableDrag: ActiveVariableDrag | null = null;

export function beginVariableDrag(drag: ActiveVariableDrag | null) {
  activeVariableDrag = drag;
}

export function getActiveVariableDrag(): ActiveVariableDrag | null {
  return activeVariableDrag;
}

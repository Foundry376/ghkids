import { EvaluatedSquare } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";

interface RecordingSquareStatusProps {
  squares: EvaluatedSquare[];
  extentXMin: number;
  extentYMin: number;
}

/**
 * Renders colored overlays on each square in the rule extent to show
 * whether that square matched during evaluation.
 */
export const RecordingSquareStatus = ({
  squares,
  extentXMin,
  extentYMin,
}: RecordingSquareStatusProps) => {
  return (
    <>
      {squares.map((square) => {
        const x = extentXMin + square.x;
        const y = extentYMin + square.y;
        const color = square.passed
          ? "rgba(116, 229, 53, 0.35)" // green
          : "rgba(255, 0, 0, 0.35)"; // red

        return (
          <div
            key={`square-status-${square.x}-${square.y}`}
            style={{
              position: "absolute",
              left: x * STAGE_CELL_SIZE,
              top: y * STAGE_CELL_SIZE,
              width: STAGE_CELL_SIZE,
              height: STAGE_CELL_SIZE,
              backgroundColor: color,
              pointerEvents: "none",
              zIndex: 10,
            }}
          />
        );
      })}
    </>
  );
};

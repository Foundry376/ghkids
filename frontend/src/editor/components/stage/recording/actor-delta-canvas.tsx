import { Position } from "../../../../types";
import { SquaresCanvas } from "./squares-canvas";

export const ActorDeltaCanvas = ({ delta }: { delta: Position }) => {
  const { x: dx, y: dy } = delta;

  const [width, height] = [Math.abs(dx) + 1, Math.abs(dy) + 1];
  return (
    <SquaresCanvas
      width={width}
      height={height}
      onDraw={(el, c, squareSize) => {
        const { x: dx, y: dy } = delta;
        // Y-up world: dy > 0 means moving up. Place world-y=0 at the bottom
        // of the canvas (Y-down), which is row (height - 1).
        let sx = 0;
        if (dx < 0) sx = Math.abs(dx);
        const startWorldY = dy >= 0 ? 0 : Math.abs(dy);
        const endWorldY = startWorldY + dy;
        const worldYToCanvasY = (wy: number) => (height - 1 - wy) * squareSize;

        c.fillStyle = "#fff";
        c.fillRect(0, 0, el.width, el.height);
        c.fillStyle = "#ccc";
        c.fillRect(sx * squareSize, worldYToCanvasY(startWorldY), squareSize, squareSize);
        c.fillStyle = "#f00";
        c.fillRect((sx + dx) * squareSize, worldYToCanvasY(endWorldY), squareSize, squareSize);

        c.lineWidth = 1;
        c.strokeStyle = "rgba(0,0,0,0.4)";
        c.strokeRect(0, 0, el.width, el.height);
      }}
    />
  );
};

import { Actor, Character, PositionRelativeToRuleExtent, RuleExtent } from "../../../../types";
import { actorFilledPoints } from "../../../utils/stage-helpers";
import { SquaresCanvas } from "./squares-canvas";

export const ActorOffsetCanvas = ({
  character,
  actor,
  extent,
  offset,
}: {
  character: Character;
  actor: Actor;
  extent: RuleExtent;
  offset: PositionRelativeToRuleExtent;
}) => {
  return (
    <SquaresCanvas
      width={extent.xmax - extent.xmin + 1}
      height={extent.ymax - extent.ymin + 1}
      onDraw={(el, c, squareSize) => {
        c.fillStyle = "#fff";
        c.fillRect(0, 0, el.width, el.height);
        c.fillStyle = "#f00";
        const actorAtOffset = { ...actor, position: { ...offset } };
        // Canvas is Y-down; world is Y-up. Flip per-cell so world-y=0 paints
        // at the bottom of the canvas.
        const heightCells = extent.ymax - extent.ymin + 1;
        for (const p of actorFilledPoints(actorAtOffset, { [actor.characterId]: character })) {
          c.fillRect(
            p.x * squareSize,
            (heightCells - 1 - p.y) * squareSize,
            squareSize,
            squareSize,
          );
        }
        c.lineWidth = 1;
        c.strokeStyle = "rgba(0,0,0,0.4)";
        c.strokeRect(0, 0, el.width, el.height);
      }}
    />
  );
};

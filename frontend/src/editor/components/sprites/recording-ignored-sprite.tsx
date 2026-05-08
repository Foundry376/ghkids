import { STAGE_CELL_SIZE } from "../../constants/constants";

const RecordingIgnoredSprite = ({ x, y }: { x: number; y: number }) => {
  return (
    <div
      style={{
        position: "absolute",
        pointerEvents: "none",
        background: `url('${new URL("../../img/ignored_square.png", import.meta.url).href}') top left no-repeat`,
        width: STAGE_CELL_SIZE,
        height: STAGE_CELL_SIZE,
        left: (x - 1) * STAGE_CELL_SIZE,
        bottom: (y - 1) * STAGE_CELL_SIZE,
      }}
    />
  );
};

export default RecordingIgnoredSprite;

import { RuleExtent } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";

const RecordingMaskSprite = ({ xmin, xmax, ymin, ymax }: Omit<RuleExtent, "ignored">) => {
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 99,
        backgroundColor: "rgba(0,0,0,0.5)",
        width: (xmax - xmin) * STAGE_CELL_SIZE,
        height: (ymax - ymin) * STAGE_CELL_SIZE,
        left: (xmin - 1) * STAGE_CELL_SIZE,
        // Y-up, 1-indexed: bottom from the bottom of the parent container.
        bottom: (ymin - 1) * STAGE_CELL_SIZE,
      }}
    />
  );
};

export default RecordingMaskSprite;

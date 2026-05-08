import { RuleExtent } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";

const RecordingMaskSprite = ({ xmin, xmax, ymin, ymax }: Omit<RuleExtent, "ignored">) => {
  return (
    <div
      style={{
        position: "absolute",
        backgroundColor: "rgba(0,0,0,0.5)",
        width: (xmax - xmin) * STAGE_CELL_SIZE,
        height: (ymax - ymin) * STAGE_CELL_SIZE,
        left: xmin * STAGE_CELL_SIZE,
        // Y-up: position from the bottom of the parent container.
        bottom: ymin * STAGE_CELL_SIZE,
      }}
    />
  );
};

export default RecordingMaskSprite;

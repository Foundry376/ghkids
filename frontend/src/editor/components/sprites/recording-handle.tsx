import React from "react";
import { Position } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";

const RecordingHandle = ({ side, position }: { side: string; position: Position }) => {
  const onDragStart = (event: React.DragEvent) => {
    const img = new Image();
    img.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    event.dataTransfer.setDragImage(img, 0, 0);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(`handle`, "true");
    event.dataTransfer.setData(`handle:${side}`, "true");
  };

  return (
    <img
      draggable
      data-stage-handle={side}
      onDragStart={onDragStart}
      className={`handle-${side}`}
      src={new URL(`../../img/tiles/handle_${side}.png`, import.meta.url).href}
      style={{
        position: "absolute",
        width: STAGE_CELL_SIZE,
        height: STAGE_CELL_SIZE,
        left: position.x * STAGE_CELL_SIZE,
        top: position.y * STAGE_CELL_SIZE,
      }}
    />
  );
};
export default RecordingHandle;

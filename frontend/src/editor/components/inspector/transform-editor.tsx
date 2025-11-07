import { useState } from "react";
import { useSelector } from "react-redux";
import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { ActorTransform, Characters, EditorState } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { appearanceParts } from "../../utils/stage-helpers";
import ActorSprite from "../sprites/actor-sprite";
import { TransformLabels } from "./transform-images";

export const RELATIVE_TRANSFORMS: {
  [key in ActorTransform]: {
    "flip-x": ActorTransform;
    "flip-y": ActorTransform;
    "0": ActorTransform;
    "90": ActorTransform;
    "180": ActorTransform;
    "270": ActorTransform;
    d1: ActorTransform;
    d2: ActorTransform;
  };
} = {
  "0": {
    "0": "0",
    "90": "90",
    "180": "180",
    "270": "270",
    "flip-x": "flip-x",
    "flip-y": "flip-y",
    d1: "d1",
    d2: "d2",
  },
  "90": {
    "0": "90",
    "90": "180",
    "180": "270",
    "270": "0",
    "flip-x": "d1",
    "flip-y": "d2",
    d1: "flip-y",
    d2: "flip-x",
  },
  "180": {
    "0": "180",
    "90": "270",
    "180": "0",
    "270": "90",
    "flip-x": "flip-y",
    "flip-y": "flip-x",
    d1: "d2",
    d2: "d1",
  },
  "270": {
    "0": "270",
    "90": "0",
    "180": "90",
    "270": "180",
    "flip-x": "d2",
    "flip-y": "d1",
    d1: "flip-x",
    d2: "flip-y",
  },
  "flip-x": {
    "0": "flip-x",
    "90": "d2",
    "180": "flip-y",
    "270": "d1",
    "flip-x": "0",
    "flip-y": "180",
    d1: "270",
    d2: "90",
  },
  "flip-y": {
    "0": "flip-y",
    "90": "d1",
    "180": "flip-x",
    "270": "d2",
    "flip-x": "180",
    "flip-y": "0",
    d1: "90",
    d2: "270",
  },
  d1: {
    "0": "d1",
    "90": "flip-x",
    "180": "d2",
    "270": "flip-y",
    "flip-x": "90",
    "flip-y": "270",
    d1: "0",
    d2: "180",
  },
  d2: {
    "0": "d2",
    "90": "flip-y",
    "180": "d1",
    "270": "flip-x",
    "flip-x": "270",
    "flip-y": "90",
    d1: "180",
    d2: "0",
  },
} as const;

export const TransformEditorModal = ({
  open,
  value,
  onChange,
  characterId,
}: {
  open: boolean;
  value: string;
  characterId?: string;
  onChange: (value: string) => void;
}) => {
  const [appearanceId, existing] = appearanceParts(value);
  const characters = useSelector<EditorState, Characters>((e) => e.characters);
  const [transform, setTransform] = useState<ActorTransform>((existing ?? "0") as ActorTransform);

  return (
    <Modal
      isOpen={open}
      backdrop="static"
      toggle={() => {}}
      style={{ maxWidth: 700, minWidth: 700 }}
    >
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Choose Direction</h4>
      </div>
      <ModalBody>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 8,
            marginBottom: 16,
            justifyContent: "center",
          }}
        >
          <Button onClick={() => setTransform("0")}>Reset</Button>
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["270"])}>
            Rotate -90º
          </Button>
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["90"])}>
            Rotate 90º
          </Button>
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["flip-x"])}>
            Flip Horizontally
          </Button>
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["flip-y"])}>
            Flip Vertically
          </Button>
        </div>
        <div
          style={{
            position: "relative",
            width: 7 * STAGE_CELL_SIZE,
            height: 7 * STAGE_CELL_SIZE,
            border: "2px solid #ccc",
            margin: "auto",
            zoom: 1.2,
            background: `url('/src/editor/img/board-grid.png') top left / ${STAGE_CELL_SIZE}px`,
          }}
        >
          {characterId && appearanceId && (
            <ActorSprite
              character={characters[characterId]}
              actor={{
                id: "0",
                variableValues: {},
                position: { x: 3, y: 3 },
                appearance: `${appearanceId}::${transform}`,
                characterId,
              }}
            />
          )}
          <div
            style={{
              width: STAGE_CELL_SIZE,
              height: STAGE_CELL_SIZE,
              border: `2px solid red`,
              outline: "1px solid white",
              left: "50%",
              top: "50%",
              zIndex: 2,
              position: "absolute",
              transform: `translate(-${STAGE_CELL_SIZE / 2}px,-${STAGE_CELL_SIZE / 2}px)`,
            }}
          />
        </div>
        <div style={{ textAlign: "center" }}>
          <strong>{TransformLabels[transform]}</strong>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={() => onChange(value)}>Cancel</Button>{" "}
        <Button
          data-tutorial-id="keypicker-done"
          onClick={() => onChange(`${appearanceId}::${transform}`)}
        >
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};

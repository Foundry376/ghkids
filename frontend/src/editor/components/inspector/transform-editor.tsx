import { useState } from "react";
import { useSelector } from "react-redux";
import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { ActorTransform, Characters, EditorState } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import ActorSprite from "../sprites/actor-sprite";
import { TransformLabels } from "./transform-images";

const RELATIVE_TRANSFORMS: {
  [key in ActorTransform]: {
    "flip-x": ActorTransform;
    "flip-y": ActorTransform;
    "rotate 90": ActorTransform;
    "rotate -90": ActorTransform;
  };
} = {
  "0": {
    "flip-x": "flip-x",
    "flip-y": "flip-y",
    "rotate 90": "90",
    "rotate -90": "270",
  },
  "90": {
    "flip-x": "d2",
    "flip-y": "d1",
    "rotate 90": "180",
    "rotate -90": "0",
  },
  "180": {
    "flip-x": "flip-x",
    "flip-y": "flip-y",
    "rotate 90": "270",
    "rotate -90": "90",
  },
  "270": {
    "flip-x": "d1",
    "flip-y": "d2",
    "rotate 90": "0",
    "rotate -90": "180",
  },
  "flip-x": {
    "flip-x": "0",
    "flip-y": "180",
    "rotate 90": "d2",
    "rotate -90": "d1",
  },
  "flip-y": {
    "flip-x": "180",
    "flip-y": "0",
    "rotate 90": "d1",
    "rotate -90": "d2",
  },
  d1: {
    "flip-x": "270",
    "flip-y": "90",
    "rotate -90": "flip-y",
    "rotate 90": "flip-x",
  },
  d2: {
    "flip-x": "90",
    "flip-y": "270",
    "rotate -90": "flip-x",
    "rotate 90": "flip-y",
  },
};

export const TransformEditorModal = ({
  open,
  value,
  onChange,
  characterId,
  appearance,
}: {
  open: boolean;
  value: ActorTransform;
  characterId?: string;
  appearance?: string;
  onChange: (value: ActorTransform) => void;
}) => {
  const characters = useSelector<EditorState, Characters>((e) => e.characters);
  const [transform, setTransform] = useState<ActorTransform>(value);
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
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["rotate -90"])}>
            Rotate -90º
          </Button>
          <Button onClick={() => setTransform(RELATIVE_TRANSFORMS[transform]["rotate 90"])}>
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
          {characterId && appearance && (
            <ActorSprite
              character={characters[characterId]}
              actor={{
                id: "0",
                variableValues: {},
                position: { x: 3, y: 3 },
                appearance,
                transform,
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
        <Button data-tutorial-id="keypicker-done" onClick={() => onChange(transform)}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};

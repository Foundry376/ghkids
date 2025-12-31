import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { useEditorSelector } from "../../../hooks/redux";
import { createStage, deleteStageId, updateStageSettings } from "../../actions/stage-actions";
import { dismissModal, selectStageId } from "../../actions/ui-actions";
import { MODALS, WORLDS } from "../../constants/constants";
import { getCurrentStage, getStagesList } from "../../utils/selectors";
import { getStageScreenshot } from "../../utils/stage-helpers";
import { StageSettings } from "./settings";

export const StagesContainer = () => {
  const dispatch = useDispatch();
  const listEl = useRef<HTMLDivElement>(null);
  const stage = useEditorSelector(getCurrentStage);
  const stagesArray = useEditorSelector(getStagesList);
  const open = useEditorSelector((state) => state.ui.modal.openId === MODALS.STAGES);

  const _scrollToSelectedStage = () => {
    const el = listEl.current;
    if (!el || !stage) {
      return;
    }

    const item = el.querySelector(`[data-stage-id="${stage.id}"]`);
    if (item instanceof HTMLElement) {
      const [minTop, maxTop] = [el.scrollTop, el.scrollTop + el.clientHeight - item.clientHeight];
      if (item.offsetTop > maxTop || item.offsetTop < minTop) {
        item.scrollIntoView();
      }
    }
  };

  useEffect(() => {
    if (open) {
      _scrollToSelectedStage();
    }
  });

  const _onSelectStage = (id: string) => {
    dispatch(selectStageId(WORLDS.ROOT, id));
  };

  const _onAddStage = () => {
    const name = `Level ${stagesArray.length + 1}`;
    dispatch(createStage(WORLDS.ROOT, name));
  };

  const _onRemoveStage = () => {
    if (stage && stagesArray.length > 1) {
      const selectedIdx = stagesArray.findIndex((s) => s.id === stage.id);
      const nextId = stagesArray[selectedIdx === 0 ? selectedIdx + 1 : selectedIdx - 1].id;

      dispatch(selectStageId(WORLDS.ROOT, nextId));
      dispatch(deleteStageId(WORLDS.ROOT, stage.id));
    }
  };

  const _onClose = () => {
    dispatch(dismissModal());
  };

  if (!stage) {
    return null;
  }

  return (
    <Modal
      isOpen={open}
      backdrop="static"
      toggle={() => {}}
      style={{ minWidth: 780, maxWidth: 780 }}
    >
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Stages</h4>
      </div>
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "stretch" }}>
        <div className="stage-sidebar">
          <div ref={listEl} className="stage-list">
            {stagesArray.map((s) => (
              <div
                key={s.id}
                data-stage-id={s.id}
                className={`stage-item ${stage.id === s.id && "selected"}`}
                onClick={() => _onSelectStage(s.id)}
              >
                <img src={getStageScreenshot(s, { size: 320 })!} />
                <h3>{s.name || "Untitled"}</h3>
              </div>
            ))}
          </div>
          <div className="bar">
            <Button className="add" onClick={_onAddStage}>
              <i className="fa fa-plus" />
            </Button>
            <Button className="remove" disabled={stagesArray.length <= 1} onClick={_onRemoveStage}>
              <i className="fa fa-minus" />
            </Button>
            <div className="space" />
          </div>
        </div>
        <ModalBody>
          <StageSettings
            stage={stage}
            key={stage.id}
            onChange={(settings) => dispatch(updateStageSettings(WORLDS.ROOT, stage.id, settings))}
          />
        </ModalBody>
      </div>
      <ModalFooter>
        <Button color="primary" onClick={_onClose}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};

import { Button, Modal, ModalBody, ModalFooter } from "reactstrap";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import { useEditorSelector } from "../../../hooks/redux";
import { createCharacterEventContainer } from "../../actions/characters-actions";
import { upsertRecordingCondition } from "../../actions/recording-actions";
import { pickConditionValueFromKeyboard } from "../../actions/ui-actions";
import { makeId } from "../../utils/utils";
import Keyboard, { keyToCodakoKey } from "./keyboard";

export const KeypickerContainer = () => {
  const dispatch = useDispatch();
  const { open, initialKey, replaceConditionKey, purpose, characterId } = useEditorSelector(
    (state) => state.ui.keypicker,
  );

  const [key, setKey] = useState<string | null>(initialKey);

  // Sync internal state when initialKey changes (equivalent to componentWillReceiveProps)
  useEffect(() => {
    setKey(initialKey);
  }, [initialKey]);

  const _onClose = () => {
    dispatch(pickConditionValueFromKeyboard(false, null, null));
  };

  const _onCloseAndSave = () => {
    if (!key) {
      return window.alert(
        "Uhoh - press a key on your keyboard or choose one in the picture to continue.",
      );
    }

    dispatch(pickConditionValueFromKeyboard(false, null, null));

    if (purpose === "event-container" && characterId) {
      dispatch(
        createCharacterEventContainer(characterId, {
          id: makeId("rule"),
          eventType: "key",
          eventCode: key,
        }),
      );
      return;
    }

    dispatch(
      upsertRecordingCondition({
        key: replaceConditionKey || makeId("condition"),
        enabled: true,
        left: { globalId: "keypress" },
        comparator: "=",
        right: { constant: key },
      }),
    );
  };

  const _onKeyDown = (event: { key: string; preventDefault: () => void }) => {
    setKey(keyToCodakoKey(event.key));
    event.preventDefault();
  };

  return (
    <Modal
      isOpen={!!open}
      backdrop="static"
      toggle={() => {}}
      style={{ maxWidth: 600, minWidth: 600 }}
    >
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Choose Key</h4>
      </div>
      <ModalBody>
        {open && <Keyboard value={key} onKeyDown={_onKeyDown} />}
      </ModalBody>
      <ModalFooter>
        <Button onClick={_onClose}>Cancel</Button>{" "}
        <Button data-tutorial-id="keypicker-done" onClick={_onCloseAndSave}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default KeypickerContainer;

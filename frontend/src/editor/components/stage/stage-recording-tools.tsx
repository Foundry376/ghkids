import { Button } from "reactstrap";
import { useDispatch } from "react-redux";

import classNames from "classnames";
import { useEditorSelector } from "../../../hooks/redux";
import { pickConditionValueFromKeyboard, selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { onPrimaryPointerDown } from "../../utils/pointer";

const StageRecordingTools = () => {
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  return (
    <div style={{ display: "flex", gap: 4 }}>
      <Button
        className={classNames({
          "tool-ignored-square": true,
          selected: selectedToolId === TOOLS.IGNORE_SQUARE,
          enabled: true,
        })}
        onPointerDown={onPrimaryPointerDown(() =>
          dispatch(
            selectToolId(
              selectedToolId === TOOLS.IGNORE_SQUARE ? TOOLS.POINTER : TOOLS.IGNORE_SQUARE,
            ),
          ),
        )}
      >
        <img src={new URL("../../img/ignored_square.png", import.meta.url).href} draggable={false} />
      </Button>
      <Button
        className={classNames({ "tool-keypress": true, enabled: true })}
        onPointerDown={onPrimaryPointerDown(() =>
          dispatch(pickConditionValueFromKeyboard(true, null, null)),
        )}
      >
        <img src={new URL("../../img/icon_event_key.png", import.meta.url).href} draggable={false} />
      </Button>
      <Button
        className={classNames({
          "tool-click": true,
          selected: selectedToolId === TOOLS.ADD_CLICK_CONDITION,
          enabled: true,
        })}
        onPointerDown={onPrimaryPointerDown(() =>
          dispatch(
            selectToolId(
              selectedToolId === TOOLS.POINTER ? TOOLS.ADD_CLICK_CONDITION : TOOLS.POINTER,
            ),
          ),
        )}
      >
        <img src={new URL("../../img/icon_event_click.png", import.meta.url).href} draggable={false} />
      </Button>
    </div>
  );
};

export default StageRecordingTools;

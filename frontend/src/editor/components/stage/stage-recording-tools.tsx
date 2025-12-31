import { useDispatch } from "react-redux";

import classNames from "classnames";
import Button from "reactstrap/lib/Button";
import { useEditorSelector } from "../../../hooks/redux";
import { pickConditionValueFromKeyboard, selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";

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
        onClick={() =>
          dispatch(
            selectToolId(
              selectedToolId === TOOLS.IGNORE_SQUARE ? TOOLS.POINTER : TOOLS.IGNORE_SQUARE,
            ),
          )
        }
      >
        <img src={new URL("../../img/ignored_square.png", import.meta.url).href} />
      </Button>
      <Button
        className={classNames({ "tool-keypress": true, enabled: true })}
        onClick={() => dispatch(pickConditionValueFromKeyboard(true, null, null))}
      >
        <img src={new URL("../../img/icon_event_key.png", import.meta.url).href} />
      </Button>
      <Button
        className={classNames({
          "tool-click": true,
          selected: selectedToolId === TOOLS.ADD_CLICK_CONDITION,
          enabled: true,
        })}
        onClick={() => {
          dispatch(
            selectToolId(
              selectedToolId === TOOLS.POINTER ? TOOLS.ADD_CLICK_CONDITION : TOOLS.POINTER,
            ),
          );
        }}
      >
        <img src={new URL("../../img/icon_event_click.png", import.meta.url).href} />
      </Button>
    </div>
  );
};

export default StageRecordingTools;

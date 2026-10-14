import { Button } from "reactstrap";
import { useDispatch } from "react-redux";

import classNames from "classnames";
import { useEditorSelector } from "../../../hooks/redux";
import { upsertRecordingCondition } from "../../actions/recording-actions";
import { pickConditionValueFromKeyboard, selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";
import { forgivingPress } from "../../utils/pointer";
import { RANDOM_CONDITION_RANGE } from "../../utils/stage-helpers";
import { makeId } from "../../utils/utils";

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
        {...forgivingPress(
          () =>
            dispatch(
              selectToolId(
                selectedToolId === TOOLS.IGNORE_SQUARE ? TOOLS.POINTER : TOOLS.IGNORE_SQUARE,
              ),
            ),
          { fireOn: "press" },
        )}
      >
        <img
          src={new URL("../../img/ignored_square.png", import.meta.url).href}
          draggable={false}
        />
      </Button>
      <Button
        className={classNames({ "tool-keypress": true, enabled: true })}
        data-tutorial-id="record-tool-keypress"
        {...forgivingPress(() => dispatch(pickConditionValueFromKeyboard(true, null, null)), {
          fireOn: "press",
        })}
      >
        <img
          src={new URL("../../img/icon_event_key.png", import.meta.url).href}
          draggable={false}
        />
      </Button>
      <Button
        className={classNames({
          "tool-click": true,
          selected: selectedToolId === TOOLS.ADD_CLICK_CONDITION,
          enabled: true,
        })}
        {...forgivingPress(
          () =>
            dispatch(
              selectToolId(
                selectedToolId === TOOLS.POINTER ? TOOLS.ADD_CLICK_CONDITION : TOOLS.POINTER,
              ),
            ),
          { fireOn: "press" },
        )}
      >
        <img
          src={new URL("../../img/icon_event_click.png", import.meta.url).href}
          draggable={false}
        />
      </Button>
      <Button
        className={classNames({ "tool-random": true, enabled: true })}
        data-tutorial-id="record-tool-random"
        title="Add a condition that only matches some of the time"
        {...forgivingPress(
          () =>
            dispatch(
              upsertRecordingCondition({
                key: makeId("condition"),
                enabled: true,
                left: { random: { ...RANDOM_CONDITION_RANGE } },
                comparator: "<",
                right: { constant: "50" },
              }),
            ),
          { fireOn: "press" },
        )}
      >
        <span className="tool-emoji">🎲</span>
      </Button>
    </div>
  );
};

export default StageRecordingTools;

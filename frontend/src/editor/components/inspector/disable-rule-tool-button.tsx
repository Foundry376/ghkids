import { Button } from "reactstrap";
import classNames from "classnames";
import { useDispatch } from "react-redux";

import { useEditorSelector } from "../../../hooks/redux";
import { selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";

// A tool local to the rules sidebar. While active, clicking a rule toggles
// whether it's enabled — letting you quickly mute/unmute rules without opening
// each one. Clicking the button again (or picking another tool) exits the mode.
const DisableRuleToolButton = ({ disabled }: { disabled: boolean }) => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const active = selectedToolId === TOOLS.DISABLE_RULE;

  const _onToggle = () => {
    dispatch(selectToolId(active ? TOOLS.POINTER : TOOLS.DISABLE_RULE));
  };

  return (
    <Button
      className={classNames("inspector-subnav-tool", { selected: active })}
      disabled={disabled}
      title="Toggle rules on or off by clicking them (hold Shift to toggle several)"
      onClick={_onToggle}
    >
      <i className="fa fa-ban" />
    </Button>
  );
};

export default DisableRuleToolButton;

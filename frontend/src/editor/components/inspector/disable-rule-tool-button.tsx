import { Button } from "reactstrap";
import classNames from "classnames";
import { useDispatch } from "react-redux";

import { useEditorSelector } from "../../../hooks/redux";
import { selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";

// Toggles the rules-sidebar-local "disable rule" tool on and off.
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
      <i className="fa fa-ban" style={{ transform: "scaleX(-1)" }} />
    </Button>
  );
};

export default DisableRuleToolButton;

import { Button } from "reactstrap";
import classNames from "classnames";
import { useDispatch } from "react-redux";

import { useEditorSelector } from "../../../hooks/redux";
import { selectToolId } from "../../actions/ui-actions";
import { TOOLS } from "../../constants/constants";

// Toggles the rules-sidebar-local "comment" tool on and off.
const CommentToolButton = ({ disabled }: { disabled: boolean }) => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const active = selectedToolId === TOOLS.COMMENT;

  const _onToggle = () => {
    dispatch(selectToolId(active ? TOOLS.POINTER : TOOLS.COMMENT));
  };

  return (
    <Button
      className={classNames("inspector-subnav-tool", { selected: active })}
      disabled={disabled}
      title="Add a comment — click a rule to annotate it, or click between rules to drop a note (hold Shift to add several)"
      onClick={_onToggle}
    >
      <i className="fa fa-comment-o" />
    </Button>
  );
};

export default CommentToolButton;

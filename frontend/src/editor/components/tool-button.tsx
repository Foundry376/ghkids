import classNames from "classnames";
import { Button } from "reactstrap";

import { useForgivingClick } from "../../hooks/useForgivingClick";
import { TOOLS } from "../constants/constants";

interface ToolButtonProps {
  toolId: TOOLS;
  selected: boolean;
  onSelect: (toolId: TOOLS) => void;
}

/**
 * A single tool button in the top toolbar. Uses {@link useForgivingClick} so a
 * press that turns into a tiny drag — common when young users nudge the mouse
 * while clicking — still selects the tool instead of being lost.
 */
export const ToolButton = ({ toolId, selected, onSelect }: ToolButtonProps) => {
  const click = useForgivingClick(() => onSelect(toolId));

  const classes = classNames({
    "tool-option": true,
    enabled: true,
    selected,
  });

  return (
    <Button key={toolId} className={classes} data-tutorial-id={`toolbar-tool-${toolId}`} {...click}>
      <img src={new URL(`../img/sidebar_${toolId}.png`, import.meta.url).href} draggable={false} />
    </Button>
  );
};

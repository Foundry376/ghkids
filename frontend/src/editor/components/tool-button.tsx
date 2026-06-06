import classNames from "classnames";
import { Button } from "reactstrap";

import { TOOLS } from "../constants/constants";
import { onPrimaryPointerDown } from "../utils/pointer";

interface ToolButtonProps {
  toolId: TOOLS;
  selected: boolean;
  onSelect: (toolId: TOOLS) => void;
}

/**
 * A single tool button in the top toolbar. The tool is selected on
 * `pointerdown` rather than `click` so it switches the instant the button is
 * pressed. This makes selection feel responsive and sidesteps the drag young
 * users accidentally produce when nudging the mouse: the switch has already
 * happened before any drag could be interpreted, and (unlike waiting for
 * release) the cursor never appears to drag the previous tool out of the
 * button.
 */
export const ToolButton = ({ toolId, selected, onSelect }: ToolButtonProps) => {
  const classes = classNames({
    "tool-option": true,
    enabled: true,
    selected,
  });

  return (
    <Button
      key={toolId}
      className={classes}
      data-tutorial-id={`toolbar-tool-${toolId}`}
      onPointerDown={onPrimaryPointerDown(() => onSelect(toolId))}
    >
      <img src={new URL(`../img/sidebar_${toolId}.png`, import.meta.url).href} draggable={false} />
    </Button>
  );
};

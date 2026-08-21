import classNames from "classnames";
import { Button } from "reactstrap";

import { TOOLS } from "../constants/constants";
import { forgivingPress } from "../utils/pointer";

interface ToolButtonProps {
  toolId: TOOLS;
  selected: boolean;
  onSelect: (toolId: TOOLS) => void;
}

/**
 * A single tool button in the top toolbar. Selecting on press rather than
 * release makes the toolbar feel instant and means the cursor never appears to
 * drag the previous tool out of the button.
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
      {...forgivingPress(() => onSelect(toolId), { fireOn: "press" })}
    >
      <img src={new URL(`../img/sidebar_${toolId}.png`, import.meta.url).href} draggable={false} />
    </Button>
  );
};

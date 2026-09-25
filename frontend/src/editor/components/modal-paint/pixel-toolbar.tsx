import classNames from "classnames";
import React from "react";
import { forgivingPress } from "../../utils/pointer";
import { PixelTool } from "./tools";

interface PixelToolbarProps {
  tools: PixelTool[];
  tool: PixelTool;
  onToolChange: (tool: PixelTool) => void;
}

const PixelToolbar: React.FC<PixelToolbarProps> = ({ tools, tool, onToolChange }) => {
  return (
    <div className="tools" data-tutorial-id="paint-tools">
      {tools.map((t) => (
        <button
          key={t.name}
          className={classNames({ tool: true, selected: tool === t })}
          // Acting on press, with the pointer captured, means a click that
          // wobbles - a Magic Mouse moves as you press it - still picks the
          // tool instead of starting a drag of the icon.
          {...forgivingPress(() => onToolChange(t), { fireOn: "press" })}
        >
          <img
            src={new URL(`../../img/tool_${t.name}.png`, import.meta.url).href}
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
};

export default PixelToolbar;

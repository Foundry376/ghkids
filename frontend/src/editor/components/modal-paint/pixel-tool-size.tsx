import classNames from "classnames";
import React from "react";
import { forgivingPress } from "../../utils/pointer";
import { PixelTool } from "./tools";

interface PixelToolSizeProps {
  tool: PixelTool;
  size: number;
  onSizeChange: (size: number) => void;
}

export const PixelToolSize: React.FC<PixelToolSizeProps> = ({ tool, size, onSizeChange }) => {
  const disabled = !tool.supportsSize();

  return (
    <div
      className={classNames("sizes", disabled ? "disabled" : false)}
      data-tutorial-id="paint-tool-size"
    >
      {[1, 2, 4, 8, 12, 16].map((s) => (
        <button
          key={s}
          disabled={disabled}
          className={classNames({ toolsize: true, selected: !disabled && size === s })}
          {...forgivingPress(() => onSizeChange(s), { fireOn: "press" })}
        >
          <div
            style={{
              width: 30,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: s * 2, height: s * 2, background: "#333" }} />
          </div>
        </button>
      ))}
    </div>
  );
};

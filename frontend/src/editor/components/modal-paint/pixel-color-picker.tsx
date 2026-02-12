import classNames from "classnames";
import React from "react";
import { hsvToRgb } from "./helpers";

// eslint-disable-next-line react-refresh/only-export-components
export const ColorOptions: string[] = [];

ColorOptions.push(`rgba(0,0,0,0)`);
for (let a = 255; a >= 0; a -= 32) {
  ColorOptions.push(`rgba(${a},${a},${a},255)`);
}
for (let h = 0; h < 72; h += 6) {
  for (let a = 0.8; a >= 0.2; a -= 0.15) {
    const [r, g, b] = hsvToRgb(h / 80.0, 1 - a, 1);
    ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  }
  for (let a = 1; a >= 0.4; a -= 0.14) {
    const [r, g, b] = hsvToRgb(h / 80.0, 1, a);
    ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  }
}

function rgbaToHex(rgba: string): string {
  const parts = rgba.match(/(\d+),(\d+),(\d+),(\d+)/);
  if (!parts) return "#000000"; // default to black if parsing fails
  const r = parseInt(parts[1]).toString(16).padStart(2, "0");
  const g = parseInt(parts[2]).toString(16).padStart(2, "0");
  const b = parseInt(parts[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgba(hex: string): string {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},255)`;
}

const TRANSPARENT_CROSS =
  "linear-gradient(45deg, transparent 0%, transparent 44%, #666 46%, #666 55%, transparent 56%, transparent 100%) no-repeat, linear-gradient(-45deg, white 0%, white 44%, #666 46%, #666 55%, white 56%, white 100%) no-repeat";

interface PixelColorPickerProps {
  color: string;
  onColorChange: (color: string) => void;
  supported: boolean;
}

const PixelColorPicker: React.FC<PixelColorPickerProps> = ({
  color,
  onColorChange,
  supported,
}) => {
  return (
    <div className={classNames("pixel-color-picker", !supported && "disabled")}>
      {color === "rgba(0,0,0,0)" ? (
        <div
          className="active-swatch transparent"
          style={{
            background: TRANSPARENT_CROSS,
            backgroundSize: "40%",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <input
          className={"active-swatch"}
          type="color"
          value={rgbaToHex(color)}
          onChange={(e) => {
            if (e.target.value) {
              const newColor = hexToRgba(e.target.value);
              onColorChange(newColor);
            }
          }}
        />
      )}
      {ColorOptions.map((option) => (
        <button
          key={option}
          style={{
            background: option === "rgba(0,0,0,0)" ? TRANSPARENT_CROSS : option,
            backgroundSize: "contain",
          }}
          className={classNames({ color: true, selected: color === option })}
          onClick={() => onColorChange(option)}
        />
      ))}
    </div>
  );
};

export default PixelColorPicker;

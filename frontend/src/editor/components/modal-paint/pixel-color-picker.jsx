import classNames from "classnames";
import PropTypes from "prop-types";
import React from "react";
import { hsvToRgb } from "./helpers";

export const ColorOptions = [
  "rgba(255,255,255,255)",
  "rgba(180,180,180,255)",
  "rgba(100,100,100,255)",
  "rgba(0,0,0,255)",
];

for (let h = 0; h < 70; h += 10) {
  let [r, g, b] = hsvToRgb(h / 80.0, 1, 1);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r, g, b] = hsvToRgb(h / 80.0, 0.4, 1);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r, g, b] = hsvToRgb(h / 80.0, 0.4, 0.75);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r, g, b] = hsvToRgb(h / 80.0, 1, 0.5);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
}

function rgbaToHex(rgba) {
  const parts = rgba.match(/(\d+),(\d+),(\d+),(\d+)/);
  if (!parts) return "#000000"; // default to black if parsing fails
  const r = parseInt(parts[1]).toString(16).padStart(2, "0");
  const g = parseInt(parts[2]).toString(16).padStart(2, "0");
  const b = parseInt(parts[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgba(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},255)`;
}

export default class PixelColorPicker extends React.Component {
  static propTypes = {
    color: PropTypes.string,
    onColorChange: PropTypes.func,
  };

  render() {
    const { color, onColorChange } = this.props;

    return (
      <div className="pixel-color-picker">
        <input
          className="active-swatch"
          type="color"
          value={rgbaToHex(color)}
          onChange={(e) => {
            if (e.target.value) {
              const newColor = hexToRgba(e.target.value);
              onColorChange(newColor);
            }
          }}
        />
        {ColorOptions.map((option) => (
          <button
            key={option}
            style={{ backgroundColor: option }}
            className={classNames({ color: true, selected: color === option })}
            onClick={() => onColorChange(option)}
          />
        ))}
      </div>
    );
  }
}

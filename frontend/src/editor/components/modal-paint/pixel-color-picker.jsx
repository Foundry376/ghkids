import React from 'react'; import PropTypes from 'prop-types';
import classNames from 'classnames';
import {hsvToRgb} from './helpers';

export const ColorOptions = [
  "rgba(255,255,255,255)",
  "rgba(180,180,180,255)",
  "rgba(100,100,100,255)",
  "rgba(0,0,0,255)",
];

for (let h = 0; h < 70; h += 10) {
  let [r,g,b] = hsvToRgb(h / 80.0, 1, 1);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r,g,b] = hsvToRgb(h / 80.0, 0.4, 1);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r,g,b] = hsvToRgb(h / 80.0, 0.4, 0.75);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
  [r,g,b] = hsvToRgb(h / 80.0, 1, 0.5);
  ColorOptions.push(`rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},255)`);
}

export default class PixelColorPicker extends React.Component {
  static propTypes = {
    color: PropTypes.string,
    onColorChange: PropTypes.func,
  };

  render() {
    const {color, onColorChange} = this.props;

    return (
      <div className="pixel-color-picker">
        <div className="active-swatch" style={{backgroundColor: color}} />
        {ColorOptions.map(option =>
          <button
            key={option}
            style={{backgroundColor: option}}
            className={classNames({'color': true, 'selected': color === option})}
            onClick={() => onColorChange(option)}
          />
        )}
      </div>
    );
  }
}

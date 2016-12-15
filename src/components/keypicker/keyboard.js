import React, {PropTypes} from 'react';
import {nameForKey} from '../game-state-helpers';

export default class Keyboard extends React.Component {
  static propTypes = {
    keyCode: PropTypes.number,
    onKeyDown: PropTypes.func,
  };

  componentDidMount() {
    this._renderKeyboard();
    this._keyboardCanvasEl.focus();
  }

  componentDidUpdate() {
    this._renderKeyboard();
    this._keyboardCanvasEl.focus();
  }

  _renderKeyboard() {
    const context = this._keyboardCanvasEl.getContext('2d');
    context.clearRect(0,0, this._keyboardCanvasEl.width, this._keyboardCanvasEl.height);

    const map = [
      ['`','1','2','3','4','5','6','7','8','9','0','-','+', {length:1.65, value: '—'}],
      [{length:1.65,value: 9},'Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
      [{length:1.87,value: '—'},'A','S','D','F','G','H','J','K','L',';', ',', {length:1.85,value: 13}],
      [{length:2.45,value: '—'},'Z','X','C','V','B','N','M','<','>','?',{length:2.45,value: '—'}],
      ['—','—','—',{length:1.6,value: '—'}, {length: 5, value: 32}, {length:1.6,value: '—'},'—',{length: 1, value: [null, 37]},{length: 1, value: [38, 40]},{length: 1, value: [null, 39]}],
    ];

    let x = 0;
    let y = 0;
    const u = this._keyboardCanvasEl.width / 15.9;

    for (const row of map) {
      for (const key of row) {
        let value = key.value || key;
        if (!(value instanceof Array)) {
          value = [value];
        }
        const w = Math.round(u * key.length);
        const h = Math.round((u - 3 * (value.length - 1)) / value.length);
        let yy = 0;
        for (const v of value) {
          if (v === '—') {
            context.fillStyle = '#eee';
          } else if ((this.props.keyCode === v) || (nameForKey(this.props.keyCode) === v)) {
            context.fillStyle = 'blue';
          } else {
            context.fillStyle = '#ccc';
          }
          if (v !== null) {
            context.fillRect(x, y + yy, w, h);
          }
          yy += h + 3;
        }
        x += w + 3;
      }
      y += u + 3;
      x = 0;
    }
  }

  render() {
    return (
      <canvas
        tabIndex={0}
        style={{outline: 0}}
        onKeyDown={this.props.onKeyDown}
        onBlur={() => this._keyboardCanvasEl.focus()}
        width={570}
        height={200}
        ref={(el) => this._keyboardCanvasEl = el}
      />
    );
  }
}

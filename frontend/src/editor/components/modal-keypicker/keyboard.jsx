import PropTypes from "prop-types";
import React from "react";
import { nameForKey } from "../../utils/event-helpers";

export function keyToCodakoKey(key) {
  if (key === " ") {
    return "Space";
  }
  return key;
}

const forEachKeyRect = (el, cb) => {
  const map = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", { length: 1.65, value: "—" }],
    [
      { length: 1.65, value: "Tab" },
      "Q",
      "W",
      "E",
      "R",
      "T",
      "Y",
      "U",
      "I",
      "O",
      "P",
      "[",
      "]",
      "\\",
    ],
    [
      { length: 1.87, value: "—" },
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      ";",
      "'",
      { length: 1.85, value: "Enter" },
    ],
    [
      { length: 2.45, value: "—" },
      "Z",
      "X",
      "C",
      "V",
      "B",
      "N",
      "M",
      ",",
      ".",
      "/",
      { length: 2.45, value: "—" },
    ],
    [
      "—",
      "—",
      "—",
      { length: 1.6, value: "—" },
      { length: 5, value: keyToCodakoKey(" ") },
      { length: 1.6, value: "—" },
      "—",
      { length: 1, value: [null, "ArrowLeft"] },
      { length: 1, value: ["ArrowUp", "ArrowDown"] },
      { length: 1, value: [null, "ArrowRight"] },
    ],
  ];

  let x = 0;
  let y = 0;
  const u = el.width / 15.9;

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
        cb(x, y + yy, w, h, v);
        yy += h + 3;
      }
      x += w + 3;
    }
    y += u + 3;
    x = 0;
  }
};

export default class Keyboard extends React.Component {
  static propTypes = {
    value: PropTypes.number,
    onKeyDown: PropTypes.func,
  };

  componentDidMount() {
    this._renderKeyboard();
    document.addEventListener("keydown", this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.onKeyDown);
  }

  componentDidUpdate() {
    this._renderKeyboard();
  }

  onKeyDown = (event) => {
    this.props.onKeyDown(event);
  };

  _renderKeyboard() {
    const context = this._keyboardCanvasEl.getContext("2d");
    context.clearRect(0, 0, this._keyboardCanvasEl.width, this._keyboardCanvasEl.height);

    console.log(this.props);
    forEachKeyRect(this._keyboardCanvasEl, (x, y, w, h, v) => {
      if (v === "—") {
        context.fillStyle = "#eee";
      } else if (
        this.props.value === v ||
        this.props.value === `${v}`.toLowerCase() ||
        nameForKey(this.props.value) === v
      ) {
        context.fillStyle = "blue";
      } else {
        context.fillStyle = "#ccc";
      }
      if (v !== null) {
        context.fillRect(x, y, w, h);
      }
    });
  }

  _onMouseUp = (e) => {
    const { top, left } = this._keyboardCanvasEl.getBoundingClientRect();
    forEachKeyRect(this._keyboardCanvasEl, (x, y, w, h, v) => {
      if (
        e.clientX - left > x &&
        e.clientX - left < x + w &&
        e.clientY - top > y &&
        e.clientY - top < y + h
      ) {
        this.props.onKeyDown({ key: v, preventDefault: () => {} });
      }
    });
  };

  render() {
    return (
      <canvas
        tabIndex={0}
        style={{ outline: 0 }}
        onMouseUp={this._onMouseUp}
        ref={(el) => (this._keyboardCanvasEl = el)}
        width={570}
        height={200}
      />
    );
  }
}

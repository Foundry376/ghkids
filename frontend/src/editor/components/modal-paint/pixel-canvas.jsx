import classNames from "classnames";
import PropTypes from "prop-types";
import React from "react";
import CreatePixelContext from "./create-pixel-context";
import { getFilledSquares } from "./helpers";

const SELECTION_ANTS_INTERVAL = 200;

function getEdgePixels(pixelMap) {
  const results = [];
  for (const p of Object.keys(pixelMap)) {
    const [x, y] = p.split(",").map(Number);
    const left = pixelMap[`${x - 1},${y}`];
    const right = pixelMap[`${x + 1},${y}`];
    const top = pixelMap[`${x},${y - 1}`];
    const bot = pixelMap[`${x},${y + 1}`];
    if (!left || !right || !top || !bot) {
      results.push([x, y, left, right, top, bot]);
    }
  }
  return results;
}

export default class PixelCanvas extends React.Component {
  static propTypes = {
    tool: PropTypes.object,
    color: PropTypes.string,
    pixelSize: PropTypes.number,
    anchorSquare: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    imageData: PropTypes.object,
    selectionImageData: PropTypes.object,
    selectionOffset: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    interactionPixels: PropTypes.object,
    onMouseDown: PropTypes.func,
    onMouseMove: PropTypes.func,
    onMouseUp: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      mousedown: false,
      mouseoverSelection: false,
    };
  }

  componentDidMount() {
    const { pixelSize } = this.props;
    this._pixelContext = this._pixelCanvas.getContext("2d");
    CreatePixelContext.call(this._pixelContext, pixelSize);

    this._pixelCanvas.addEventListener("mousemove", this._onMouseMove);

    this.renderToCanvas();
  }

  componentDidUpdate() {
    const selectionPresent = Object.keys(this._selectionPixels()).length;

    if (this._pixelContext.getPixelSize() !== this.props.pixelSize) {
      this._pixelContext = this._pixelCanvas.getContext("2d");
      CreatePixelContext.call(this._pixelContext, this.props.pixelSize);
    }

    if (selectionPresent && !this._timer) {
      this._timer = setInterval(() => this.renderToCanvas(), SELECTION_ANTS_INTERVAL);
    } else if (!selectionPresent && this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    this.renderToCanvas();
  }

  _pixelForEvent({ clientX, clientY }) {
    const { top, left } = this._pixelCanvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - left) / this.props.pixelSize),
      y: Math.floor((clientY - top) / this.props.pixelSize),
    };
  }

  _selectionPixels() {
    if (this.props.interactionPixels) {
      return this.props.interactionPixels;
    }

    if (this.props.selectionImageData) {
      return this.props.selectionImageData.getOpaquePixels();
    }

    return {};
  }

  renderToCanvas() {
    const { pixelSize, imageData, selectionImageData, selectionOffset, tool } = this.props;
    const c = this._pixelContext;

    c.fillStyle = "rgb(255,255,255)";
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);

    if (pixelSize > 3) {
      c.drawTransparentPattern();
    }
    if (imageData) {
      c.applyPixelsFromData(imageData, 0, 0, imageData.width, imageData.height, 0, 0, {});
    }

    if (selectionImageData) {
      c.applyPixelsFromData(
        selectionImageData,
        0,
        0,
        selectionImageData.width,
        selectionImageData.height,
        selectionOffset.x,
        selectionOffset.y,
        {},
      );
    }

    if (imageData && (imageData.width > 40 || imageData.height > 40)) {
      const anchor = this.props.anchorSquare || { x: 0, y: 0 };
      const filled = getFilledSquares(imageData);

      c.fillStyle = "rgba(100,100,100,0.15)";
      for (let x = 0; x < imageData.width; x += 40) {
        for (let y = 0; y < imageData.height; y += 40) {
          const isAnchorSquare = anchor.x * 40 === x && anchor.y * 40 === y;
          c.lineWidth = isAnchorSquare ? 2 : 1;
          c.strokeStyle = isAnchorSquare ? "rgba(255,70,70,1)" : "rgba(100,100,100,0.25)";
          c.strokeRect(
            x * pixelSize + 0.5,
            y * pixelSize + 0.5,
            40 * pixelSize - 1,
            40 * pixelSize - 1,
          );

          if (!filled[`${x / 40},${y / 40}`]) {
            c.fillRect(x * pixelSize + 0.5, y * pixelSize + 0.5, 40 * pixelSize, 40 * pixelSize);
          }
        }
      }
    }
    if (tool && tool.render) {
      tool.render(c, this.props, true);
    }

    const edgePixels = getEdgePixels(this._selectionPixels());

    if (edgePixels.length) {
      c.beginPath();
      for (const [x, y, left, right, top, bot] of edgePixels) {
        if (
          (Math.floor(Date.now() / SELECTION_ANTS_INTERVAL) + x + y * (imageData.width + 1)) % 2 ===
          0
        ) {
          const topY = (y + selectionOffset.y) * pixelSize + 0.5;
          const botY = (y + 1 + selectionOffset.y) * pixelSize + 0.5;
          const leftX = (x + selectionOffset.x) * pixelSize + 0.5;
          const rightX = (x + 1 + selectionOffset.x) * pixelSize + 0.5;
          if (!left) {
            c.moveTo(leftX, topY);
            c.lineTo(leftX, botY);
          }
          if (!right) {
            c.moveTo(rightX, topY);
            c.lineTo(rightX, botY);
          }
          if (!top) {
            c.moveTo(leftX, topY);
            c.lineTo(rightX, topY);
          }
          if (!bot) {
            c.moveTo(leftX, botY);
            c.lineTo(rightX, botY);
          }
        }
      }
      c.lineWidth = 2.4;
      c.strokeStyle = "rgba(255,255,255,1)";
      c.lineCap = "round";
      c.stroke();
      c.lineWidth = 1;
      c.strokeStyle = "rgba(0,0,0,1)";
      c.stroke();
    }

    if (pixelSize > 5) {
      c.drawGrid();
    }
  }

  _onMouseDown = (event) => {
    this._pixelCanvas.removeEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("mouseup", this._onMouseUp);
    this.props.onMouseDown(event, this._pixelForEvent(event));
    this.setState({ mousedown: true });
  };

  _onMouseMove = (event) => {
    const p = this._pixelForEvent(event);

    if (this.state.mousedown) {
      this.props.onMouseMove(event, p);
    }

    const mouseoverSelection =
      this._selectionPixels()[
        `${p.x - this.props.selectionOffset.x},${p.y - this.props.selectionOffset.y}`
      ];
    if (mouseoverSelection !== this.state.mouseoverSelection) {
      this.setState({ mouseoverSelection });
    }
  };

  _onMouseUp = (event) => {
    this._pixelCanvas.addEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mousemove", this._onMouseMove);
    document.removeEventListener("mouseup", this._onMouseUp);

    if (this.state.mousedown) {
      this.props.onMouseUp(event, this._pixelForEvent(event));
      this.setState({ mousedown: false });
    }
  };

  render() {
    const { width, height } = this.props.imageData || { width: 1, height: 1 };

    return (
      <div
        style={{ width: 455, height: 455, overflow: "scroll", lineHeight: 0, background: "#ccc" }}
      >
        <div
          style={{
            minHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <canvas
            style={{ backgroundColor: "white" }}
            width={width * this.props.pixelSize}
            height={height * this.props.pixelSize}
            className={classNames({
              mousedown: this.state.mousedown,
              mouseoverSelection: this.state.mouseoverSelection,
            })}
            onMouseDown={this._onMouseDown}
            ref={(el) => (this._pixelCanvas = el)}
          />
        </div>
      </div>
    );
  }
}

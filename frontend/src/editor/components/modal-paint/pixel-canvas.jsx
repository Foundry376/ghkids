import React, {PropTypes} from 'react';
import classNames from 'classnames';
import CreatePixelContext from './create-pixel-context';

const SELECTION_ANTS_INTERVAL = 200;

function getEdgePixels(pixelMap) {
  const results = [];
  for (const p of Object.keys(pixelMap)) {
    const [x, y] = p.split(',').map(v => v / 1);
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
    const {pixelSize} = this.props;
    this._pixelContext = this._pixelCanvas.getContext('2d');
    CreatePixelContext.call(this._pixelContext, pixelSize);

    this._pixelCanvas.addEventListener('mousemove', this._onMouseMove);

    this.renderToCanvas();
  }

  componentDidUpdate() {
    const selectionPresent = Object.keys(this._selectionPixels()).length;

    if (selectionPresent && !this._timer) {
      this._timer = setInterval(() => this.renderToCanvas(), SELECTION_ANTS_INTERVAL);
    } else if (!selectionPresent && this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    this.renderToCanvas();
  }
  
  _pixelForEvent({clientX, clientY}) {
    const {top, left} = this._pixelCanvas.getBoundingClientRect();
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
    const {pixelSize, imageData, selectionImageData, selectionOffset} = this.props;
    const c = this._pixelContext;

    c.fillStyle = "rgb(255,255,255)";
    c.clearRect(0,0, c.canvas.width, c.canvas.height);
    c.drawTransparentPattern();

    if (imageData) {
      c.applyPixelsFromData(imageData, 0, 0, imageData.width, imageData.height, 0, 0, {});
    }

    if (selectionImageData) {
      c.applyPixelsFromData(selectionImageData, 0, 0, selectionImageData.width, selectionImageData.height, selectionOffset.x, selectionOffset.y, {});
    }

    if (this.props.tool && this.props.tool.render) {
      this.props.tool.render(c, this.props, true);
    }

    const edgePixels = getEdgePixels(this._selectionPixels());

    if (edgePixels.length) {
      c.beginPath();
      for (const [x, y, left, right, top, bot] of edgePixels) {
        if ((Math.floor(Date.now() / SELECTION_ANTS_INTERVAL) + x + y * (imageData.width + 1)) % 2 === 0) {
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
      c.lineCap = 'round';
      c.stroke();
      c.lineWidth = 1;
      c.strokeStyle = "rgba(0,0,0,1)";
      c.stroke();
    }

    c.drawGrid();
  }

  _onMouseDown = (event) => {
    this._pixelCanvas.removeEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    this.props.onMouseDown(event, this._pixelForEvent(event));
    this.setState({mousedown: true});
  }

  _onMouseMove = (event) => {
    const p = this._pixelForEvent(event);

    if (this.state.mousedown) {
      this.props.onMouseMove(event, p);
    }

    const mouseoverSelection = this._selectionPixels()[`${p.x - this.props.selectionOffset.x},${p.y - this.props.selectionOffset.y}`];
    if (mouseoverSelection !== this.state.mouseoverSelection) {
      this.setState({mouseoverSelection});
    }
  }

  _onMouseUp = (event) => {
    this._pixelCanvas.addEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);

    if (this.state.mousedown) {
      this.props.onMouseUp(event, this._pixelForEvent(event));
      this.setState({mousedown: false});
    }
  }

  render() {
    return (
      <canvas
        width="440"
        height="440"
        className={classNames({
          'mousedown': this.state.mousedown,
          'mouseoverSelection': this.state.mouseoverSelection,
        })}
        onMouseDown={this._onMouseDown}
        ref={(el) => this._pixelCanvas = el}
      />
    );
  }
}

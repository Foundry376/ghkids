import React, {PropTypes} from 'react';

const MARGIN_X = 55;
const MARGIN_Y = 40;

export default class TutorialAnnotation extends React.Component {
  static propTypes = {
    style: PropTypes.string,
    selectors: PropTypes.arrayOf(PropTypes.string),
    options: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);

    this.targetEls = [];
    this.targetObservers = [];
    this.state = {
      seed: Math.random(),
      fraction: 0,
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.reposition);
    document.addEventListener('scroll', this.onSomeElementScrolled, true);

    this.animateForSelectors(this.props.selectors);
    this.reposition(null, this.props);
    this.draw();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selectors !== nextProps.selectors) {
      this.animateForSelectors(nextProps.selectors);
      this.reposition(null, nextProps);
    }
  }

  componentDidUpdate() {
    this.draw();
    if (this.state.fraction >= 1) {
      clearTimeout(this._timer);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.reposition);
    document.removeEventListener('scroll', this.onSomeElementScrolled, true);
    this.disconnectFromSelectors();
  }

  onSomeElementScrolled = (event) => {
    if (event.target !== document) {
      window.requestAnimationFrame(this.reposition);
    }
  }

  animateForSelectors(selectors) {
    this.disconnectFromSelectors();

    this.targetEls = (selectors || []).map(sel => document.querySelector(sel));
    this.targetObservers = this.targetEls.filter(el => !!el).map(el => {
      const o = new MutationObserver(this.reposition);
      o.observe(el, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      return o;
    });

    if (this.targetEls.length) {
      if (this.state.fraction !== 0) {
        this.setState({fraction: 0, seed: Math.random()});
      }
      this._timer = setInterval(() => {
        this.setState({fraction: this.state.fraction + 0.007});
      }, 1 / 20.0);
    }
  }

  disconnectFromSelectors() {
    this.targetObservers.map(o => o.disconnect());
    this.targetObservers = [];
    clearTimeout(this._timer);
  }

  allTargetsPresent() {
    return this.targetEls.length && this.targetEls.every(el => !!el);
  }
  
  reposition = (e, props = this.props) => {
    if (!this.allTargetsPresent()) {
      this._el.style.opacity = 0;
      return;
    }
    const targetRects = this.targetEls.map(el => el.getBoundingClientRect());
    const res = window.devicePixelRatio || 1;
    const options = props.options || {};

    const top = Math.min(...targetRects.map(rect => rect.top)) - MARGIN_Y + (options.offsetTop || 0);
    const left = Math.min(...targetRects.map(rect => rect.left)) - MARGIN_X + (options.offsetLeft || 0);
    const width = options.width ? (options.width + MARGIN_X * 2) : (Math.max(...targetRects.map(rect => rect.right)) - left + MARGIN_X);
    const height = options.height ? (options.height + MARGIN_Y * 2) : (Math.max(...targetRects.map(rect => rect.bottom)) - top + MARGIN_Y);

    this._el.style.opacity = 1;
    this._el.style.top = `${top}px`;
    this._el.style.left = `${left}px`;
    this._el.style.width = `${width}px`;
    this._el.style.height = `${height}px`;
    this._el.width = width * res;
    this._el.height = height * res;

    this.targetRelativeBounds = targetRects.map((r) => {
      return {top: r.top - top, left: r.left - left, width: r.width, height: r.height, right: r.right - left, bottom: r.bottom - top};
    });
    this.draw();
  }

  draw = () => {
    const ctx = this._el.getContext('2d');
    const scale = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.clearRect(0,0, this._el.width, this._el.height);

    if (!this.allTargetsPresent()) {
      return;
    }

    const env = {
      width: this._el.width / scale,
      height: this._el.height / scale,
    };
    if (this.props.style === 'arrow') {
      if (this.targetEls.length !== 2) { return; }
      this.drawArrow(ctx, env);
    } else if (this.props.style === 'outline') {
      if (this.targetEls.length !== 1) { return; }
      this.drawOutline(ctx, env);
    }
  }

  drawArrow = (ctx) => {
    const start = {
      x: this.targetRelativeBounds[0].left + this.targetRelativeBounds[0].width / 2,
      y: this.targetRelativeBounds[0].top + this.targetRelativeBounds[0].height / 2,
    };
    const end = {
      x: this.targetRelativeBounds[1].left + this.targetRelativeBounds[1].width / 2,
      y: this.targetRelativeBounds[1].top + this.targetRelativeBounds[1].height / 2,
    };

    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.strokeStyle = "red";

    const dx = (end.x - start.x) * this.state.fraction;
    const dy = (end.y - start.y) * this.state.fraction;

    for (let x = 0; x <= 10; x ++) {
      const f = x / 10;
      ctx.lineWidth = 5 + x * 0.8;
      ctx.beginPath();
      ctx.moveTo(start.x + dx * f, start.y + dy * f);
      ctx.lineTo(start.x + dx, start.y + dy);
      ctx.stroke();
    }

    const r = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(start.x + dx, start.y + dy);
    ctx.lineTo(start.x + dx - Math.cos(r - Math.PI * 0.3) * 20, start.y + dy - Math.sin(r - Math.PI * 0.3) * 20);
    ctx.moveTo(start.x + dx, start.y + dy);
    ctx.lineTo(start.x + dx - Math.cos(r + Math.PI * 0.3) * 20, start.y + dy - Math.sin(r + Math.PI * 0.3) * 20);
    ctx.stroke();
  }

  drawOutline = (ctx, {width, height}) => {
    const cx = width / 2 - 5;
    const cy = height / 2;
    const lineWidth = 8;
    let rx = cx - 25;
    let ry = cy - 25;
    let deg = 0;

    ctx.strokeStyle = "red";
    ctx.beginPath();

    const degStart = -150 + this.state.seed * 20;
    const degEnd = (degStart + 410 * Math.sin(this.state.fraction * Math.PI / 2));
    const degStep = 1 / (Math.max(rx,ry) / 50);
    let taper = 0;

    for (deg = degStart; deg < degEnd; deg += degStep) {
      if (deg > degEnd - 15)
        taper += 0.05;

      ctx.moveTo(cx + Math.cos(deg * Math.PI/180.0) * (rx - 8 + taper), cy + Math.sin(deg * Math.PI/180.0) * (ry - lineWidth + taper));
      ctx.lineTo(cx + Math.cos((deg + 4) * Math.PI/180.0) * (rx - taper), cy + Math.sin((deg + 4) * Math.PI/180.0) * (ry-taper));

      if (deg > 200) {
        ry += 0.07 + (-0.02 + (1 - this.state.seed) * 0.04);
        rx += 0.1 + (-0.04 + this.state.seed * 0.08);
      } else if (deg > 80) {
        rx -= 0.05 + (-0.04 + (1 - this.state.seed) * 0.08);
      }

    }
    ctx.closePath();
    ctx.stroke();
  }

  render() {
    return (
      <div style={{position: 'absolute', top:0,left:0, right:0, bottom:0, overflow: 'hidden', pointerEvents:'none'}}>
        <canvas
          ref={(el) => this._el = el}
          style={{position:'absolute', zIndex:3000}}
        />
      </div>
    );
  }
}

import React from "react";

const MARGIN_X = 55;
const MARGIN_Y = 40;

interface AnnotationOptions {
  offsetTop?: number;
  offsetLeft?: number;
  width?: number;
  height?: number;
}

interface TutorialAnnotationProps {
  style?: "arrow" | "outline";
  selectors?: string[];
  options?: AnnotationOptions;
}

interface TutorialAnnotationState {
  seed: number;
  fraction: number;
}

interface RelativeBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface DrawEnv {
  width: number;
  height: number;
}

export default class TutorialAnnotation extends React.Component<
  TutorialAnnotationProps,
  TutorialAnnotationState
> {
  private _el: HTMLCanvasElement | null = null;
  private _timer: ReturnType<typeof setInterval> | undefined;
  private targetEls: (Element | null)[] = [];
  private targetObservers: MutationObserver[] = [];
  private targetRelativeBounds: RelativeBounds[] = [];

  constructor(props: TutorialAnnotationProps) {
    super(props);

    this.state = {
      seed: Math.random(),
      fraction: 0,
    };
  }

  componentDidMount(): void {
    window.addEventListener("resize", this.reposition);
    document.addEventListener("scroll", this.onSomeElementScrolled, true);

    this.animateForSelectors(this.props.selectors);
    this.reposition(undefined, this.props);
    this.draw();
  }

  UNSAFE_componentWillReceiveProps(nextProps: TutorialAnnotationProps): void {
    if (this.props.selectors !== nextProps.selectors) {
      this.animateForSelectors(nextProps.selectors);
      this.reposition(undefined, nextProps);
    }
  }

  componentDidUpdate(): void {
    this.draw();
    if (this.state.fraction >= 1) {
      clearTimeout(this._timer);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.reposition);
    document.removeEventListener("scroll", this.onSomeElementScrolled, true);
    this.disconnectFromSelectors();
  }

  private onSomeElementScrolled = (event: Event): void => {
    if (event.target !== document) {
      window.requestAnimationFrame(this.reposition);
    }
  };

  private animateForSelectors(selectors: string[] | undefined): void {
    this.disconnectFromSelectors();

    this.targetEls = (selectors || []).map((sel) => document.querySelector(sel));
    this.targetObservers = this.targetEls
      .filter((el): el is Element => !!el)
      .map((el) => {
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
        this.setState({ fraction: 0, seed: Math.random() });
      }
      this._timer = setInterval(() => {
        this.setState({ fraction: this.state.fraction + 0.007 });
      }, 1 / 20.0);
    }
  }

  private disconnectFromSelectors(): void {
    this.targetObservers.forEach((o) => o.disconnect());
    this.targetObservers = [];
    clearTimeout(this._timer);
  }

  private allTargetsPresent(): boolean {
    return this.targetEls.length > 0 && this.targetEls.every((el) => !!el);
  }

  private reposition = (
    _e?: Event | MutationRecord[],
    props: TutorialAnnotationProps = this.props,
  ): void => {
    if (!this._el) {
      return;
    }
    if (!this.allTargetsPresent()) {
      this._el.style.opacity = "0";
      return;
    }
    const targetRects = this.targetEls
      .filter((el): el is Element => !!el)
      .map((el) => el.getBoundingClientRect());
    const res = window.devicePixelRatio || 1;
    const options = props.options || {};

    const top =
      Math.min(...targetRects.map((rect) => rect.top)) - MARGIN_Y + (options.offsetTop || 0);
    const left =
      Math.min(...targetRects.map((rect) => rect.left)) - MARGIN_X + (options.offsetLeft || 0);
    const width = options.width
      ? options.width + MARGIN_X * 2
      : Math.max(...targetRects.map((rect) => rect.right)) - left + MARGIN_X;
    const height = options.height
      ? options.height + MARGIN_Y * 2
      : Math.max(...targetRects.map((rect) => rect.bottom)) - top + MARGIN_Y;

    this._el.style.opacity = "1";
    this._el.style.top = `${top}px`;
    this._el.style.left = `${left}px`;
    this._el.style.width = `${width}px`;
    this._el.style.height = `${height}px`;
    this._el.width = width * res;
    this._el.height = height * res;

    this.targetRelativeBounds = targetRects.map((r) => {
      return {
        top: r.top - top,
        left: r.left - left,
        width: r.width,
        height: r.height,
        right: r.right - left,
        bottom: r.bottom - top,
      };
    });
    this.draw();
  };

  private draw = (): void => {
    if (!this._el) {
      return;
    }
    const ctx = this._el.getContext("2d");
    if (!ctx) {
      return;
    }
    const scale = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, this._el.width, this._el.height);

    if (!this.allTargetsPresent()) {
      return;
    }

    const env: DrawEnv = {
      width: this._el.width / scale,
      height: this._el.height / scale,
    };
    if (this.props.style === "arrow") {
      if (this.targetEls.length !== 2) {
        return;
      }
      this.drawArrow(ctx);
    } else if (this.props.style === "outline") {
      if (this.targetEls.length !== 1) {
        return;
      }
      this.drawOutline(ctx, env);
    }
  };

  private drawArrow = (ctx: CanvasRenderingContext2D): void => {
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

    for (let x = 0; x <= 10; x++) {
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
    ctx.lineTo(
      start.x + dx - Math.cos(r - Math.PI * 0.3) * 20,
      start.y + dy - Math.sin(r - Math.PI * 0.3) * 20,
    );
    ctx.moveTo(start.x + dx, start.y + dy);
    ctx.lineTo(
      start.x + dx - Math.cos(r + Math.PI * 0.3) * 20,
      start.y + dy - Math.sin(r + Math.PI * 0.3) * 20,
    );
    ctx.stroke();
  };

  private drawOutline = (ctx: CanvasRenderingContext2D, { width, height }: DrawEnv): void => {
    const cx = width / 2 - 5;
    const cy = height / 2;
    const lineWidth = 8;
    let rx = cx - 25;
    let ry = cy - 25;

    ctx.strokeStyle = "red";
    ctx.beginPath();

    const degStart = -150 + this.state.seed * 20;
    const degEnd = degStart + 410 * Math.sin((this.state.fraction * Math.PI) / 2);
    const degStep = 1 / (Math.max(rx, ry) / 50);
    let taper = 0;

    for (let deg = degStart; deg < degEnd; deg += degStep) {
      if (deg > degEnd - 15) taper += 0.05;

      ctx.moveTo(
        cx + Math.cos((deg * Math.PI) / 180.0) * (rx - 8 + taper),
        cy + Math.sin((deg * Math.PI) / 180.0) * (ry - lineWidth + taper),
      );
      ctx.lineTo(
        cx + Math.cos(((deg + 4) * Math.PI) / 180.0) * (rx - taper),
        cy + Math.sin(((deg + 4) * Math.PI) / 180.0) * (ry - taper),
      );

      if (deg > 200) {
        ry += 0.07 + (-0.02 + (1 - this.state.seed) * 0.04);
        rx += 0.1 + (-0.04 + this.state.seed * 0.08);
      } else if (deg > 80) {
        rx -= 0.05 + (-0.04 + (1 - this.state.seed) * 0.08);
      }
    }
    ctx.closePath();
    ctx.stroke();
  };

  render(): React.ReactNode {
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <canvas ref={(el) => (this._el = el)} style={{ position: "absolute", zIndex: 3000 }} />
      </div>
    );
  }
}

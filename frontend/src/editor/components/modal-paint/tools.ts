import { forEachInLine, forEachInRect, getFlattenedImageData, Point } from "./helpers";
import { PixelContext, PixelImageData, PixelInteraction, PixelToolState } from "./types";

export interface ToolRenderTarget {
  fillStyle: string;
  fillPixel(x: number, y: number): void;
  fillToolSize(x: number, y: number, size: number): void;
  // Canvas context methods for preview rendering
  beginPath?(): void;
  moveTo?(x: number, y: number): void;
  lineTo?(x: number, y: number): void;
  stroke?(): void;
  closePath?(): void;
  translate?(x: number, y: number): void;
  strokeWidth?: number;
  strokeStyle?: string;
  lineCap?: CanvasLineCap;
  lineWidth?: number;
}

export class PixelTool {
  name: string;

  constructor() {
    this.name = "Undefined";
  }

  mousedown(
    point: Point,
    props: PixelToolState,
    _event?: MouseEvent | React.MouseEvent
  ): Partial<PixelToolState> {
    return {
      ...props,
      interaction: {
        s: point,
        e: point,
        points: [point],
      },
    };
  }

  mousemove(point: Point, props: PixelToolState): Partial<PixelToolState> {
    return {
      ...props,
      interaction: {
        s: props.interaction.s,
        e: point,
        points: [...props.interaction.points, point],
      },
    };
  }

  mouseup(props: PixelToolState): Partial<PixelToolState> {
    if (!props.imageData) {
      return props;
    }
    const nextImageData = props.imageData.clone();
    this.render(nextImageData, props);

    return {
      ...props,
      imageData: nextImageData,
      interaction: {
        s: null,
        e: null,
        points: [],
      },
    };
  }

  supportsSize(): boolean {
    return false;
  }

  supportsColor(): boolean {
    return false;
  }

  render(
    _context: ToolRenderTarget,
    _props: PixelToolState,
    _isPreview?: boolean
  ): void {
    // no effect by default
  }
}

export class PixelFillRectTool extends PixelTool {
  constructor() {
    super();
    this.name = "rect";
  }

  render(
    context: ToolRenderTarget,
    { color, interaction }: PixelToolState
  ): void {
    if (!interaction.s || !interaction.e) {
      return;
    }
    context.fillStyle = color;
    forEachInRect(interaction.s, interaction.e, (x, y) => {
      context.fillPixel(x, y);
    });
  }

  supportsColor(): boolean {
    return true;
  }
}

export class PixelPaintbucketTool extends PixelTool {
  constructor() {
    super();
    this.name = "paintbucket";
  }

  render(
    context: ToolRenderTarget,
    { imageData, interaction, color }: PixelToolState
  ): void {
    if (!interaction.e || !imageData) {
      return;
    }
    context.fillStyle = color;
    imageData.getContiguousPixels(interaction.e, (p) => {
      context.fillPixel(p.x, p.y);
    });
  }

  supportsColor(): boolean {
    return true;
  }
}

export class PixelFillEllipseTool extends PixelTool {
  constructor() {
    super();
    this.name = "ellipse";
  }

  render(
    context: ToolRenderTarget,
    { color, interaction }: PixelToolState
  ): void {
    const { s, e } = interaction;
    if (!s || !e) {
      return;
    }

    const rx = (e.x - s.x) / 2;
    const ry = (e.y - s.y) / 2;
    const cx = Math.round(s.x + rx);
    const cy = Math.round(s.y + ry);

    context.fillStyle = color;
    forEachInRect(s, e, (x, y) => {
      if (Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2) < 1) {
        context.fillPixel(x, y);
      }
    });
  }

  supportsColor(): boolean {
    return true;
  }
}

export class PixelPenTool extends PixelTool {
  constructor() {
    super();
    this.name = "pen";
  }

  render(
    context: ToolRenderTarget,
    { color, toolSize, interaction: { points } }: PixelToolState
  ): void {
    if (!points || !points.length) {
      return;
    }
    context.fillStyle = color;
    let prev = points[0];
    for (const point of points) {
      forEachInLine(prev.x, prev.y, point.x, point.y, (x, y) =>
        context.fillToolSize(x, y, toolSize)
      );
      prev = point;
    }
  }

  supportsSize(): boolean {
    return true;
  }

  supportsColor(): boolean {
    return true;
  }
}

export class PixelLineTool extends PixelTool {
  constructor() {
    super();
    this.name = "line";
  }

  render(
    context: ToolRenderTarget,
    { color, pixelSize, interaction, toolSize }: PixelToolState,
    isPreview?: boolean
  ): void {
    const { s, e } = interaction;
    if (!s || !e) {
      return;
    }
    context.fillStyle = color;
    forEachInLine(s.x, s.y, e.x, e.y, (x, y) => context.fillToolSize(x, y, toolSize));
    if (isPreview && context.beginPath) {
      context.beginPath();
      context.moveTo!((s.x + 0.5) * pixelSize, (s.y + 0.5) * pixelSize);
      context.lineTo!((e.x + 0.5) * pixelSize, (e.y + 0.5) * pixelSize);
      context.translate!(0.5, 0.5);
      context.strokeWidth = 0.5;
      context.strokeStyle = "rgba(0,0,0,1)";
      context.stroke!();
      context.translate!(1, 1);
      context.strokeStyle = "rgba(255,255,255,1)";
      context.stroke!();
      context.translate!(-1.5, -1.5);
      context.closePath!();
    }
  }

  supportsSize(): boolean {
    return true;
  }

  supportsColor(): boolean {
    return true;
  }
}

export class PixelEraserTool extends PixelTool {
  constructor() {
    super();
    this.name = "eraser";
  }

  render(
    context: ToolRenderTarget,
    { toolSize, interaction: { points } }: PixelToolState,
    _isPreview?: boolean
  ): void {
    if (!points || !points.length) {
      return;
    }

    context.fillStyle = "rgba(0, 0, 0, 0)";
    let prev = points[0];
    for (const point of points) {
      forEachInLine(prev.x, prev.y, point.x, point.y, (x, y) =>
        context.fillToolSize(x, y, toolSize)
      );
      prev = point;
    }
  }

  supportsSize(): boolean {
    return true;
  }
}

class PixelSelectionTool extends PixelTool {
  selectionOffsetForProps(props: PixelToolState & { initialSelectionOffset?: Point }): Point {
    const {
      interaction: { s, e },
      initialSelectionOffset,
    } = props;
    if (!s || !e || !initialSelectionOffset) {
      return { x: 0, y: 0 };
    }
    return {
      x: initialSelectionOffset.x + (e.x - s.x),
      y: initialSelectionOffset.y + (e.y - s.y),
    };
  }

  selectionPixelsForProps(
    _props: PixelToolState
  ): Record<string, boolean> | null {
    // override in subclasses
    return null;
  }

  shouldDrag(
    point: Point,
    { selectionImageData, selectionOffset }: PixelToolState
  ): boolean {
    const x = point.x - selectionOffset.x;
    const y = point.y - selectionOffset.y;
    return !!(selectionImageData && selectionImageData.getOpaquePixels()[`${x},${y}`]);
  }

  mousedown(
    point: Point,
    props: PixelToolState,
    event?: MouseEvent | React.MouseEvent
  ): Partial<PixelToolState> {
    if (this.shouldDrag(point, props)) {
      return {
        ...super.mousedown(point, props),
        imageData: event && event.altKey ? getFlattenedImageData(props) : props.imageData,
        initialSelectionOffset: props.selectionOffset,
        draggingSelection: true,
      };
    }

    const result = {
      ...super.mousedown(point, props),
      imageData: getFlattenedImageData(props),
      selectionImageData: null,
      selectionOffset: { x: 0, y: 0 },
      interactionPixels: this.selectionPixelsForProps(props),
    };
    return result;
  }

  mousemove(point: Point, props: PixelToolState): Partial<PixelToolState> {
    if (props.draggingSelection) {
      return {
        ...super.mousemove(point, props),
        selectionOffset: this.selectionOffsetForProps(props),
      };
    }
    return {
      ...super.mousemove(point, props),
      interactionPixels: this.selectionPixelsForProps(props),
    };
  }

  mouseup(props: PixelToolState): Partial<PixelToolState> {
    if (props.draggingSelection) {
      return {
        ...super.mouseup(props),
        selectionOffset: this.selectionOffsetForProps(props),
        draggingSelection: false,
      };
    }

    if (!props.imageData) {
      return props;
    }

    const selectionImageData = props.imageData.clone();

    if (!props.interactionPixels) {
      return props;
    }

    selectionImageData.maskUsingPixels(props.interactionPixels);

    const imageData = props.imageData.clone();
    for (const key of Object.keys(props.interactionPixels)) {
      const [x, y] = key.split(",").map(Number);
      imageData.fillPixelRGBA(x, y, 0, 0, 0, 0);
    }

    const result = {
      ...super.mouseup(props),
      selectionOffset: { x: 0, y: 0 },
      selectionImageData,
      imageData,
      interactionPixels: null,
    };

    return result;
  }
}

export class PixelRectSelectionTool extends PixelSelectionTool {
  constructor() {
    super();
    this.name = "select";
  }

  selectionPixelsForProps({ interaction }: PixelToolState): Record<string, boolean> | null {
    if (!interaction.s || !interaction.e) {
      return null;
    }
    const interactionPixels: Record<string, boolean> = {};
    forEachInRect(interaction.s, interaction.e, (x, y) => {
      interactionPixels[`${x},${y}`] = true;
    });
    return interactionPixels;
  }
}

export class PixelMagicSelectionTool extends PixelSelectionTool {
  constructor() {
    super();
    this.name = "magicWand";
  }

  selectionPixelsForProps({ imageData, interaction }: PixelToolState): Record<string, boolean> {
    if (!interaction || !interaction.e) {
      return {};
    }

    if (!imageData) {
      return {};
    }

    const pixels = imageData.getContiguousPixels(interaction.e);
    return pixels;
  }
}

export class EyedropperTool extends PixelTool {
  constructor() {
    super();
    this.name = "eyedropper";
  }

  mouseup(props: PixelToolState): Partial<PixelToolState> {
    const { imageData, interaction } = props;

    if (!interaction.e || !imageData) {
      return super.mouseup(props);
    }
    const [r, g, b, a] = imageData.getPixel(interaction.e.x, interaction.e.y);

    return {
      ...props,
      color: `rgba(${r},${g},${b},${a})`,
      interaction: {
        s: null,
        e: null,
        points: [],
      },
    };
  }

  supportsColor(): boolean {
    return true;
  }
}

export class ChooseAnchorSquareTool extends PixelTool {
  prevTool: PixelTool;

  constructor(prevTool: PixelTool) {
    super();
    this.prevTool = prevTool;
    this.name = "anchor-square";
  }

  mouseup(props: PixelToolState): Partial<PixelToolState> & { tool?: PixelTool } {
    const { interaction } = props;

    if (!interaction.e) {
      return super.mouseup(props);
    }
    return {
      ...super.mouseup(props),
      anchorSquare: { x: Math.floor(interaction.e.x / 40), y: Math.floor(interaction.e.y / 40) },
      tool: this.prevTool,
    };
  }
}

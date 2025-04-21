import { forEachInLine, forEachInRect, getFlattenedImageData } from "./helpers";

export class PixelTool {
  constructor() {
    this.name = "Undefined";
  }

  mousedown(point, props) {
    return Object.assign({}, props, {
      interaction: {
        s: point,
        e: point,
        points: [point],
      },
    });
  }

  mousemove(point, props) {
    return Object.assign({}, props, {
      interaction: {
        s: props.interaction.s,
        e: point,
        points: [].concat(props.interaction.points, [point]),
      },
    });
  }

  mouseup(props) {
    const nextImageData = props.imageData.clone();
    this.render(nextImageData, props);

    return Object.assign({}, props, {
      imageData: nextImageData,
      interaction: {
        s: null,
        e: null,
        points: [],
      },
    });
  }

  render() {
    // no effect
  }
}

export class PixelFillRectTool extends PixelTool {
  constructor() {
    super();
    this.name = "rect";
  }

  render(context, { color, interaction }) {
    if (!interaction.s || !interaction.e) {
      return;
    }
    context.fillStyle = color;
    forEachInRect(interaction.s, interaction.e, (x, y) => {
      context.fillPixel(x, y);
    });
  }
}

export class PixelPaintbucketTool extends PixelTool {
  constructor() {
    super();
    this.name = "paintbucket";
  }

  render(context, { imageData, interaction, color }) {
    if (!interaction.e) {
      return;
    }
    context.fillStyle = color;
    imageData.getContiguousPixels(interaction.e, (p) => {
      context.fillPixel(p.x, p.y);
    });
  }
}

export class PixelFillEllipseTool extends PixelTool {
  constructor() {
    super();
    this.name = "ellipse";
  }

  render(context, { color, interaction }) {
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
}

export class PixelPenTool extends PixelTool {
  constructor() {
    super();
    this.name = "pen";
  }

  render(context, { color, interaction: { points } }) {
    if (!points || !points.length) {
      return;
    }
    context.fillStyle = color;
    let prev = points[0];
    for (const point of points) {
      forEachInLine(prev.x, prev.y, point.x, point.y, (x, y) => context.fillPixel(x, y));
      prev = point;
    }
  }
}

export class PixelLineTool extends PixelTool {
  constructor() {
    super();
    this.name = "line";
  }

  render(context, { color, pixelSize, interaction }, isPreview) {
    const { s, e } = interaction;
    if (!s || !e) {
      return;
    }
    context.fillStyle = color;
    forEachInLine(s.x, s.y, e.x, e.y, (x, y) => context.fillPixel(x, y));
    if (isPreview) {
      context.beginPath();
      context.moveTo((s.x + 0.5) * pixelSize, (s.y + 0.5) * pixelSize);
      context.lineTo((e.x + 0.5) * pixelSize, (e.y + 0.5) * pixelSize);
      context.translate(0.5, 0.5);
      context.strokeWidth = 0.5;
      context.strokeStyle = "rgba(0,0,0,1)";
      context.stroke();
      context.translate(1, 1);
      context.strokeStyle = "rgba(255,255,255,1)";
      context.stroke();
      context.translate(-1.5, -1.5);
      context.closePath();
    }
  }
}

export class PixelEraserTool extends PixelTool {
  constructor() {
    super();
    this.name = "eraser";
  }

  render(context, { color, interaction: { points } }, isPreview) {
    if (!points || !points.length) {
      return;
    }
    let prev = points[0];
    for (const point of points) {
      if (isPreview) {
        forEachInLine(prev.x, prev.y, point.x, point.y, (x, y) => context.clearPixel(x, y));
      } else {
        context.fillStyle = "rgba(0,0,0,0)";
        forEachInLine(prev.x, prev.y, point.x, point.y, (x, y) => context.fillPixel(x, y));
      }
      prev = point;
    }
  }
}

class PixelSelectionTool extends PixelTool {
  selectionOffsetForProps(props) {
    const {
      interaction: { s, e },
      initialSelectionOffset,
    } = props;
    return {
      x: initialSelectionOffset.x + (e.x - s.x),
      y: initialSelectionOffset.y + (e.y - s.y),
    };
  }

  selectionPixelsForProps() {
    // override in subclasses
  }

  shouldDrag(point, { selectionImageData, selectionOffset }) {
    const x = point.x - selectionOffset.x;
    const y = point.y - selectionOffset.y;
    return selectionImageData && selectionImageData.getOpaquePixels()[`${x},${y}`];
  }

  mousedown(point, props, event) {
    if (this.shouldDrag(point, props)) {
      return Object.assign({}, super.mousedown(point, props), {
        imageData: event.altKey ? getFlattenedImageData(props) : props.imageData,
        initialSelectionOffset: props.selectionOffset,
        draggingSelection: true,
      });
    }

    return Object.assign({}, super.mousedown(point, props), {
      imageData: getFlattenedImageData(props),
      selectionImageData: null,
      selectionOffset: { x: 0, y: 0 },
      interactionPixels: this.selectionPixelsForProps(props),
    });
  }

  mousemove(point, props) {
    if (props.draggingSelection) {
      return Object.assign({}, super.mousemove(point, props), {
        selectionOffset: this.selectionOffsetForProps(props),
      });
    }
    return Object.assign({}, super.mousemove(point, props), {
      interactionPixels: this.selectionPixelsForProps(props),
    });
  }

  mouseup(props) {
    if (props.draggingSelection) {
      return Object.assign({}, super.mouseup(props), {
        selectionOffset: this.selectionOffsetForProps(props),
        draggingSelection: false,
      });
    }

    const selectionImageData = props.imageData.clone();
    selectionImageData.maskUsingPixels(props.interactionPixels);

    const imageData = props.imageData.clone();
    for (const key of Object.keys(props.interactionPixels)) {
      const [x, y] = key.split(",").map(Number);
      imageData.fillPixelRGBA(x, y, 0, 0, 0, 0);
    }
    return Object.assign({}, super.mouseup(props), {
      selectionOffset: { x: 0, y: 0 },
      selectionImageData,
      imageData,
      interactionPixels: null,
    });
  }
}

export class PixelRectSelectionTool extends PixelSelectionTool {
  constructor() {
    super();
    this.name = "select";
  }

  selectionPixelsForProps({ interaction }) {
    if (!interaction.s || !interaction.e) {
      return null;
    }
    const interactionPixels = {};
    forEachInRect(interaction.s, interaction.e, (x, y) => (interactionPixels[`${x},${y}`] = true));
    return interactionPixels;
  }
}

export class PixelMagicSelectionTool extends PixelSelectionTool {
  constructor() {
    super();
    this.name = "magicWand";
  }

  selectionPixelsForProps({ imageData, interaction }) {
    if (!interaction.e) {
      return {};
    }
    return imageData.getContiguousPixels(interaction.e);
  }
}

export class EyedropperTool extends PixelTool {
  constructor() {
    super();
    this.name = "eyedropper";
  }

  mouseup(props) {
    const { imageData, interaction } = props;

    if (!interaction.e) {
      return super.mouseup(props);
    }
    const [r, g, b, a] = imageData.getPixel(interaction.e.x, interaction.e.y);

    return Object.assign({}, props, {
      color: `rgba(${r},${g},${b},${a})`,
      interaction: {
        s: null,
        e: null,
        points: [],
      },
    });
  }
}

export class ChooseAnchorSquareTool extends PixelTool {
  constructor(prevTool) {
    super();
    this.prevTool = prevTool;
    this.name = "anchor-square";
  }

  mouseup(props) {
    const { imageData, interaction } = props;

    if (!interaction.e) {
      return super.mouseup(props);
    }
    return Object.assign({}, super.mouseup(props), {
      anchorSquare: { x: Math.floor(interaction.e.x / 40), y: Math.floor(interaction.e.y / 40) },
      tool: this.prevTool,
    });
  }
}

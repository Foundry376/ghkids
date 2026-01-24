import { forEachInRect, getDataURLFromImageData, Point } from "./helpers";
import { PixelImageData } from "./types";

/**
 * Extends an ImageData object with pixel manipulation methods.
 * Call this function with ImageData as `this` context.
 *
 * @example
 * const imageData = ctx.getImageData(0, 0, width, height);
 * CreatePixelImageData.call(imageData);
 * // Now imageData has clone(), fillPixel(), etc.
 */
export default function CreatePixelImageData(this: PixelImageData): void {
  this.clone = (): PixelImageData => {
    const clone = new ImageData(
      new Uint8ClampedArray(this.data),
      this.width,
      this.height,
    ) as PixelImageData;
    CreatePixelImageData.call(clone);
    return clone;
  };

  this.log = (): void => {
    const url = getDataURLFromImageData(this);
    const img = new Image();
    img.onload = () => {
      const dim = {
        string: "+",
        style:
          "font-size: 1px; padding: " +
          Math.floor(img.height / 2) +
          "px " +
          Math.floor(img.width / 2) +
          "px; line-height: " +
          img.height +
          "px;",
      };
      console.log(
        "%c" + dim.string,
        dim.style +
          "background: url(" +
          url +
          "); background-size: " +
          this.width +
          "px " +
          this.height +
          "px; color: transparent;",
      );
    };
    img.src = url!;
  };

  this.maskUsingPixels = (mask: Record<string, boolean>): void => {
    forEachInRect({ x: 0, y: 0 }, { x: this.width, y: this.height }, (x, y) => {
      if (!mask[`${x},${y}`]) {
        this.fillPixelRGBA(x, y, 0, 0, 0, 0);
      }
    });
  };

  this.applyPixelsFromData = (
    imageData: ImageData,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    offsetX: number,
    offsetY: number,
    options: { ignoreClearPixels?: boolean } = {},
  ): void => {
    const { data, width } = imageData;
    for (let x = startX; x < endX; x++) {
      if (x + offsetX >= this.width || x + offsetX < 0) {
        continue;
      }
      for (let y = startY; y < endY; y++) {
        if (y + offsetY >= this.height || y + offsetY < 0) {
          continue;
        }
        const r = data[(y * width + x) * 4 + 0];
        const g = data[(y * width + x) * 4 + 1];
        const b = data[(y * width + x) * 4 + 2];
        const a = data[(y * width + x) * 4 + 3];
        if (!(options.ignoreClearPixels && a <= 0)) {
          this.fillPixelRGBA(x + offsetX, y + offsetY, r, g, b, a);
        }
      }
    }
  };

  this._fillStyle = null;
  this._fillStyleComponents = [0, 0, 0, 0];
  Object.defineProperty(this, "fillStyle", {
    get: (): string | null => this._fillStyle,
    set: (color: string): void => {
      this._fillStyle = color;
      this._fillStyleComponents = color.substr(5, color.length - 6).split(",");
    },
  });

  this.fillPixel = (xx: number, yy: number): void => {
    if (!this._fillStyle) {
      throw new Error("fillPixel requires a color.");
    }
    if (xx >= this.width || xx < 0 || yy >= this.height || yy < 0) {
      return;
    }
    this.fillPixelRGBA(xx, yy, ...(this._fillStyleComponents as [number, number, number, number]));
  };

  this.fillToolSize = (x: number, y: number, size: number): void => {
    const xmin = x - Math.floor(size / 2);
    const ymin = y - Math.floor(size / 2);
    for (let px = xmin; px < xmin + size; px++) {
      for (let py = ymin; py < ymin + size; py++) {
        this.fillPixel(px, py);
      }
    }
  };

  this.fillPixelRGBA = (
    xx: number,
    yy: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void => {
    if (xx < 0 || xx >= this.width) {
      return;
    }
    if (yy < 0 || yy >= this.height) {
      return;
    }
    this.data[(yy * this.width + xx) * 4 + 0] = r / 1;
    this.data[(yy * this.width + xx) * 4 + 1] = g / 1;
    this.data[(yy * this.width + xx) * 4 + 2] = b / 1;
    this.data[(yy * this.width + xx) * 4 + 3] = a / 1;
  };

  this.getPixel = (xx: number, yy: number): [number, number, number, number] => {
    const oo = (yy * this.width + xx) * 4;
    return [this.data[oo], this.data[oo + 1], this.data[oo + 2], this.data[oo + 3]];
  };

  this.clearPixelsInRect = (startX: number, startY: number, endX: number, endY: number): void => {
    forEachInRect({ x: startX, y: startY }, { x: endX, y: endY }, (x, y) =>
      this.fillPixelRGBA(x, y, 0, 0, 0, 0),
    );
  };

  this.getContiguousPixels = (
    startPixel: Point,
    callback?: (p: Point) => void,
  ): Record<string, boolean> => {
    const points: Point[] = [startPixel];
    const startPixelData = this.getPixel(startPixel.x, startPixel.y);

    const pointsHit: Record<string, boolean> = {};
    pointsHit[`${startPixel.x},${startPixel.y}`] = true;
    let p = points.pop();

    while (p) {
      if (callback) {
        callback(p);
      }

      for (const d of [
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
      ]) {
        const pp = { x: p.x + d.x, y: p.y + d.y };
        const pkey = `${pp.x},${pp.y}`;
        if (pointsHit[pkey]) {
          continue;
        }
        if (!(pp.x >= 0 && pp.y >= 0 && pp.x < this.width && pp.y < this.height)) {
          continue;
        }

        const pixelData = this.getPixel(pp.x, pp.y);
        let colorDelta = 0;
        for (let i = 0; i < 4; i++) {
          colorDelta += Math.abs(pixelData[i] - startPixelData[i]);
        }
        if (colorDelta < 15) {
          pointsHit[pkey] = true;
          points.push(pp);
        }
      }

      p = points.pop();
    }
    return pointsHit;
  };

  this.getOpaquePixels = (): Record<string, boolean> => {
    const pixels: Record<string, boolean> = {};
    forEachInRect({ x: 0, y: 0 }, { x: this.width, y: this.height }, (x, y) => {
      const [, , , a] = this.getPixel(x, y);
      if (a > 0) {
        pixels[`${x},${y}`] = true;
      }
    });
    return pixels;
  };
}

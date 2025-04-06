import { forEachInRect, getDataURLFromImageData } from "./helpers";

export default function CreatePixelImageData() {
  this.clone = () => {
    const clone = new ImageData(new Uint8ClampedArray(this.data), this.width, this.height);
    CreatePixelImageData.call(clone);
    return clone;
  };

  this.log = () => {
    const url = getDataURLFromImageData(this);
    const img = new Image();
    img.onload = function () {
      const dim = {
        string: "+",
        style:
          "font-size: 1px; padding: " +
          Math.floor(this.height / 2) +
          "px " +
          Math.floor(this.width / 2) +
          "px; line-height: " +
          this.height +
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
    img.src = url;
  };

  this.maskUsingPixels = (mask) => {
    forEachInRect({ x: 0, y: 0 }, { x: this.width, y: this.height }, (x, y) => {
      if (!mask[`${x},${y}`]) {
        this.fillPixelRGBA(x, y, 0, 0, 0, 0);
      }
    });
  };

  this.applyPixelsFromData = (
    imageData,
    startX,
    startY,
    endX,
    endY,
    offsetX,
    offsetY,
    options = {},
  ) => {
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
    get: () => this._fillStyle,
    set: (color) => {
      this._fillStyle = color;
      this._fillStyleComponents = color.substr(5, color.length - 6).split(",");
    },
  });

  this.fillPixel = (xx, yy) => {
    if (!this._fillStyle) {
      throw new Error("fillPixel requires a color.");
    }
    if (xx >= this.width || xx < 0 || yy >= this.height || yy < 0) {
      return;
    }
    this.fillPixelRGBA(xx, yy, ...this._fillStyleComponents);
  };

  this.fillPixelRGBA = (xx, yy, r, g, b, a) => {
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

  this.getPixel = (xx, yy) => {
    const oo = (yy * this.width + xx) * 4;
    return [this.data[oo], this.data[oo + 1], this.data[oo + 2], this.data[oo + 3]];
  };

  this.clearPixelsInRect = (startX, startY, endX, endY) => {
    forEachInRect({ x: startX, y: startY }, { x: endX, y: endY }, (x, y) =>
      this.fillPixelRGBA(x, y, 0, 0, 0, 0),
    );
  };

  this.getContiguousPixels = (startPixel, callback) => {
    const points = [startPixel];
    const startPixelData = this.getPixel(startPixel.x, startPixel.y);

    const pointsHit = {};
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

  this.getOpaquePixels = () => {
    const pixels = {};
    forEachInRect({ x: 0, y: 0 }, { x: this.width, y: this.height }, (x, y) => {
      const [, , , a] = this.getPixel(x, y);
      if (a > 0) {
        pixels[`${x},${y}`] = true;
      }
    });
    return pixels;
  };
}

export default function CreatePixelContext(PixelSize) {
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
    let lastSetColor = null;
    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const r = data[(y * width + x) * 4 + 0];
        const g = data[(y * width + x) * 4 + 1];
        const b = data[(y * width + x) * 4 + 2];
        const a = data[(y * width + x) * 4 + 3];
        if (!(options.ignoreClearPixels && a <= 0)) {
          if (lastSetColor !== `rgba(${r},${g},${b},${a})`) {
            lastSetColor = `rgba(${r},${g},${b},${a})`;
            this.fillStyle = `rgba(${r},${g},${b},${a})`;
          }
          this.fillPixel(x + offsetX, y + offsetY);
        }
      }
    }
  };

  this.fillPixel = (x, y) => {
    this.fillRect(x * PixelSize, y * PixelSize, PixelSize, PixelSize);
  };

  this.clearPixel = (x, y) => {
    this.clearRect(x * PixelSize, y * PixelSize, PixelSize, PixelSize);
  };

  this.getPixelExtent = () => {
    return {
      xMax: Math.ceil(this.canvas.width / PixelSize),
      yMax: Math.ceil(this.canvas.height / PixelSize),
    };
  };

  this.getPixelSize = () => {
    return PixelSize;
  };

  this._cachedTransparentPattern = null;

  this.drawTransparentPattern = () => {
    const { xMax, yMax } = this.getPixelExtent();

    if (
      !this._cachedTransparentPattern ||
      this._cachedTransparentPattern.width !== xMax * PixelSize ||
      this._cachedTransparentPattern.height !== yMax * PixelSize
    ) {
      const off = document.createElement("canvas");
      off.width = xMax * PixelSize;
      off.height = yMax * PixelSize;
      const ctx = off.getContext("2d");
      ctx.clearRect(0, 0, off.width, off.height);
      ctx.fillStyle = "rgba(230,230,230,1)";
      for (let x = 0; x < xMax; x++) {
        for (let y = 0; y < yMax; y++) {
          ctx.fillRect(x * PixelSize, y * PixelSize, PixelSize / 2, PixelSize / 2);
          ctx.fillRect(
            x * PixelSize + PixelSize / 2,
            y * PixelSize + PixelSize / 2,
            PixelSize / 2,
            PixelSize / 2,
          );
        }
      }
      this._cachedTransparentPattern = off;
    }

    this.drawImage(this._cachedTransparentPattern, 0, 0);
  };

  this.drawGrid = () => {
    const { xMax, yMax } = this.getPixelExtent();
    this.lineWidth = 0.5;
    this.strokeStyle = "rgba(70,70,70,0.30)";
    this.beginPath();
    for (let x = 0; x < xMax; x++) {
      this.moveTo(x * PixelSize + 0.5, 0);
      this.lineTo(x * PixelSize + 0.5, yMax * PixelSize + 0.5);
    }
    for (let y = 0; y < yMax; y++) {
      this.moveTo(0, y * PixelSize + 0.5);
      this.lineTo(xMax * PixelSize + 0.5, y * PixelSize + 0.5);
    }

    // draw final bottom right edge
    this.moveTo(xMax * PixelSize - 0.5, 0);
    this.lineTo(xMax * PixelSize - 0.5, yMax * PixelSize - 0.5);
    this.moveTo(0, yMax * PixelSize - 0.5);
    this.lineTo(xMax * PixelSize - 0.5, yMax * PixelSize - 0.5);

    this.stroke();
  };
}

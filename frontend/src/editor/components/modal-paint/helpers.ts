import { PixelImageData } from "./types";

export interface Point {
  x: number;
  y: number;
}

export type PixelCallback = (x: number, y: number) => void | "break";

export function forEachInRect(s: Point, e: Point, pixelCallback: PixelCallback): void {
  let [sx, sy, ex, ey] = [s.x, s.y, e.x, e.y];
  if (ex < sx) {
    [ex, sx] = [sx, ex];
  }
  if (ey < sy) {
    [ey, sy] = [sy, ey];
  }
  for (let x = sx; x <= ex; x++) {
    for (let y = sy; y <= ey; y++) {
      if (pixelCallback(x, y) === "break") {
        return;
      }
    }
  }
}

export function forEachInLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pixelCallback: (x: number, y: number) => void,
): void {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let x = x0;
  let y = y0;
  let err = dx - dy;
  let arrived = false;

  while (arrived === false) {
    pixelCallback(x, y);

    if (x === x1 && y === y1) {
      arrived = true;
      break;
    }

    const e2 = 2 * err;
    if (e2 > -dy) {
      err = err - dy;
      x = x + sx;
    }

    if (e2 < dx) {
      err = err + dx;
      y = y + sy;
    }
  }
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r: number, g: number, b: number;
  r = g = b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
  }
  return [r * 255, g * 255, b * 255];
}

const tempCanvas = document.createElement("canvas");

export async function getBlobFromImageData(imageData: ImageData | null): Promise<Blob | null> {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempContext = tempCanvas.getContext("2d")!;
  tempContext.clearRect(0, 0, imageData.width, imageData.height);
  tempContext.putImageData(imageData, 0, 0);
  return new Promise((resolve) => tempCanvas.toBlob(resolve));
}

export function getDataURLFromImageData(imageData: ImageData | null): string | null {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempContext = tempCanvas.getContext("2d")!;
  tempContext.clearRect(0, 0, imageData.width, imageData.height);
  tempContext.putImageData(imageData, 0, 0);
  return tempCanvas.toDataURL();
}

export interface NewFrameOptions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

export function getImageDataWithNewFrame(
  imageData: ImageData | null,
  { width, height, offsetX, offsetY }: NewFrameOptions,
): ImageData | null {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempContext = tempCanvas.getContext("2d")!;
  tempContext.clearRect(0, 0, width, height);
  tempContext.putImageData(imageData, offsetX, offsetY);
  return tempContext.getImageData(0, 0, width, height);
}

export interface ImageDataFromURLOptions {
  maxWidth?: number;
  maxHeight?: number;
  fill?: boolean;
}

export function getImageDataFromDataURL(
  dataURL: string,
  { maxWidth, maxHeight, fill }: ImageDataFromURLOptions = {},
  callback: (imageData: ImageData) => void,
): void {
  const img = new Image();
  img.onload = () => {
    let width: number, height: number;

    if (fill && maxWidth && maxHeight) {
      // Scale to fill the target dimensions exactly, cropping if needed
      const scale = Math.max(maxHeight / img.height, maxWidth / img.width);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      width = tempCanvas.width = maxWidth;
      height = tempCanvas.height = maxHeight;

      const tempContext = tempCanvas.getContext("2d")!;
      tempContext.imageSmoothingEnabled = false;
      tempContext.clearRect(0, 0, width, height);
      // Center the scaled image (may crop edges)
      tempContext.drawImage(
        img,
        (width - scaledWidth) / 2,
        (height - scaledHeight) / 2,
        scaledWidth,
        scaledHeight,
      );
      callback(tempContext.getImageData(0, 0, width, height));
    } else {
      // Original behavior: scale to fit within bounds, preserving aspect ratio
      const scale = maxWidth ? Math.min(1, maxHeight! / img.height, maxWidth / img.width) : 1;
      width = tempCanvas.width = img.width * scale;
      height = tempCanvas.height = img.height * scale;

      const tempContext = tempCanvas.getContext("2d")!;
      tempContext.imageSmoothingEnabled = false;
      tempContext.clearRect(0, 0, width, height);
      tempContext.drawImage(img, 0, 0, width, height);
      callback(tempContext.getImageData(0, 0, width, height));
    }
  };
  img.src = dataURL;
}

export interface FlattenedImageDataInput {
  imageData: PixelImageData | null;
  selectionImageData: PixelImageData | null;
  selectionOffset: Point;
}

export function getFlattenedImageData({
  imageData,
  selectionImageData,
  selectionOffset,
}: FlattenedImageDataInput): PixelImageData | null {
  if (!selectionImageData) {
    return imageData;
  }
  if (!imageData) {
    return null;
  }
  const nextImageData = imageData.clone();
  nextImageData.applyPixelsFromData(
    selectionImageData,
    0,
    0,
    selectionImageData.width,
    selectionImageData.height,
    selectionOffset.x,
    selectionOffset.y,
    { ignoreClearPixels: true },
  );
  return nextImageData;
}

export function getFilledSquares(imageData: ImageData | null): Record<string, boolean> {
  const filled: Record<string, boolean> = {};

  if (!imageData) {
    return filled;
  }

  for (let x = 0; x < imageData.width; x += 40) {
    for (let y = 0; y < imageData.height; y += 40) {
      forEachInRect({ x, y }, { x: x + 40, y: y + 40 }, (px, py) => {
        const idx = (py * imageData.width + px) * 4;
        if (imageData.data[idx + 3] > 0) {
          filled[`${Math.floor(x / 40)},${Math.floor(y / 40)}`] = true;
          return "break";
        }
      });
    }
  }
  return filled;
}

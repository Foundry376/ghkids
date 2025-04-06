export function forEachInRect(s, e, pixelCallback) {
  let [sx, sy, ex, ey] = [s.x, s.y, e.x, e.y];
  if (ex < sx) {
    [ex, sx] = [sx, ex];
  }
  if (ey < sy) {
    [ey, sy] = [sy, ey];
  }
  for (let x = sx; x < ex; x++) {
    for (let y = sy; y < ey; y++) {
      pixelCallback(x, y);
    }
  }
}

export function forEachInLine(x0, y0, x1, y1, pixelCallback) {
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

export function hsvToRgb(h, s, v) {
  let r, g, b;
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

export async function getBlobFromImageData(imageData) {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempContext = tempCanvas.getContext("2d");
  tempContext.clearRect(0, 0, imageData.width, imageData.height);
  tempContext.putImageData(imageData, 0, 0);
  return new Promise((resolve) => tempCanvas.toBlob(resolve));
}

export function getDataURLFromImageData(imageData) {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  const tempContext = tempCanvas.getContext("2d");
  tempContext.clearRect(0, 0, imageData.width, imageData.height);
  tempContext.putImageData(imageData, 0, 0);
  return tempCanvas.toDataURL();
}

export function getImageDataWithNewFrame(imageData, { width, height, offsetX, offsetY }) {
  if (!imageData) {
    return null;
  }
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempContext = tempCanvas.getContext("2d");
  tempContext.clearRect(0, 0, width, height);
  tempContext.putImageData(imageData, offsetX, offsetY);
  return tempContext.getImageData(0, 0, width, height);
}

export function getImageDataFromDataURL(dataURL, { maxWidth, maxHeight } = {}, callback) {
  const img = new Image();
  img.onload = () => {
    const scale = maxWidth ? Math.min(1, maxHeight / img.height, maxWidth / img.width) : 1;
    const width = (tempCanvas.width = img.width * scale);
    const height = (tempCanvas.height = img.height * scale);

    const tempContext = tempCanvas.getContext("2d");
    tempContext.imageSmoothingEnabled = false;
    tempContext.clearRect(0, 0, width, height);
    tempContext.drawImage(
      img,
      (width - img.width * scale) / 2,
      (height - img.height * scale) / 2,
      img.width * scale,
      img.height * scale,
    );
    callback(tempContext.getImageData(0, 0, width, height));
  };
  img.src = dataURL;
}

export function getFlattenedImageData({ imageData, selectionImageData, selectionOffset }) {
  if (!selectionImageData) {
    return imageData;
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
    {
      ignoreClearPixels: true,
    },
  );
  return nextImageData;
}

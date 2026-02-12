import { useEffect, useRef } from "react";

// eslint-disable-next-line react-refresh/only-export-components
export function keyToCodakoKey(key: string): string {
  if (key === " ") {
    return "Space";
  }
  return key;
}

type KeyValue = string | null;
type KeyConfig = string | { length: number; value: string | [KeyValue, KeyValue] };

const forEachKeyRect = (
  el: HTMLCanvasElement,
  cb: (x: number, y: number, w: number, h: number, v: KeyValue) => void,
) => {
  const map: KeyConfig[][] = [
    ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", { length: 1.65, value: "—" }],
    [
      { length: 1.65, value: "Tab" },
      "Q",
      "W",
      "E",
      "R",
      "T",
      "Y",
      "U",
      "I",
      "O",
      "P",
      "[",
      "]",
      "\\",
    ],
    [
      { length: 1.87, value: "—" },
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      ";",
      "'",
      { length: 1.85, value: "Enter" },
    ],
    [
      { length: 2.45, value: "—" },
      "Z",
      "X",
      "C",
      "V",
      "B",
      "N",
      "M",
      ",",
      ".",
      "/",
      { length: 2.45, value: "—" },
    ],
    [
      "—",
      "—",
      "—",
      { length: 1.6, value: "—" },
      { length: 5, value: keyToCodakoKey(" ") },
      { length: 1.6, value: "—" },
      "—",
      { length: 1, value: [null, "ArrowLeft"] },
      { length: 1, value: ["ArrowUp", "ArrowDown"] },
      { length: 1, value: [null, "ArrowRight"] },
    ],
  ];

  let x = 0;
  let y = 0;
  const u = el.width / 15.9;

  for (const row of map) {
    for (const key of row) {
      const keyObj = typeof key === "object" ? key : { length: 1, value: key };
      const value: KeyValue[] = Array.isArray(keyObj.value) ? keyObj.value : [keyObj.value];
      const w = Math.round(u * keyObj.length);
      const h = Math.round((u - 3 * (value.length - 1)) / value.length);
      let yy = 0;
      for (const v of value) {
        cb(x, y + yy, w, h, v);
        yy += h + 3;
      }
      x += w + 3;
    }
    y += u + 3;
    x = 0;
  }
};

interface KeyboardProps {
  value: string | null;
  onKeyDown: (event: { key: string; preventDefault: () => void }) => void;
}

const Keyboard = ({ value, onKeyDown }: KeyboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderKeyboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    forEachKeyRect(canvas, (x, y, w, h, v) => {
      if (v === "—") {
        context.fillStyle = "#eee";
      } else if (
        value === v ||
        value === `${v}`.toLowerCase()
      ) {
        context.fillStyle = "blue";
      } else {
        context.fillStyle = "#ccc";
      }
      if (v !== null) {
        context.fillRect(x, y, w, h);
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      onKeyDown(event);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onKeyDown]);

  useEffect(() => {
    renderKeyboard();
  });

  const _onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { top, left } = canvas.getBoundingClientRect();
    forEachKeyRect(canvas, (x, y, w, h, v) => {
      if (
        e.clientX - left > x &&
        e.clientX - left < x + w &&
        e.clientY - top > y &&
        e.clientY - top < y + h
      ) {
        onKeyDown({ key: v as string, preventDefault: () => {} });
      }
    });
  };

  return (
    <canvas
      tabIndex={0}
      style={{ outline: 0 }}
      onMouseUp={_onMouseUp}
      ref={canvasRef}
      width={570}
      height={200}
    />
  );
};

export default Keyboard;

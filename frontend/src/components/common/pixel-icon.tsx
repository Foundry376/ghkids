/**
 * Icons for the in-app pages, authored as pixel maps instead of vector paths.
 * Everything inside Codako is drawn on a grid — characters, stages, rules — so
 * the menu iconography is drawn the same way: each glyph is a 12x12 map where
 * every character indexes into the glyph's legend and "." is transparent.
 *
 * To add a glyph: keep the map square, keep every row the same length, and
 * reuse the palette below so the icons stay in the app's color family.
 */

export const PIXEL_INK = "#3c3830";
export const PIXEL_GREEN = "#6db33f";
export const PIXEL_CYAN = "#5bc0de";
export const PIXEL_AMBER = "#e2a12b";
export const PIXEL_MUTED = "#9d968a";

type PixelGlyph = { legend: Record<string, string>; rows: string[] };

const GLYPHS = {
  /** An empty stage with a plus in the middle — a new, blank world. */
  create: {
    legend: { "#": PIXEL_INK, "+": PIXEL_GREEN },
    rows: [
      "............",
      ".##########.",
      ".#........#.",
      ".#...++...#.",
      ".#...++...#.",
      ".#.++++++.#.",
      ".#.++++++.#.",
      ".#...++...#.",
      ".#...++...#.",
      ".#........#.",
      ".##########.",
      "............",
    ],
  },
  /** A folder of saved games. */
  open: {
    legend: { "#": PIXEL_INK, o: PIXEL_CYAN },
    rows: [
      "............",
      "............",
      ".####.......",
      ".#..#.......",
      ".##########.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".##########.",
      "............",
      "............",
    ],
  },
  /** A book of lessons. */
  learn: {
    legend: { "#": PIXEL_INK, "-": PIXEL_AMBER },
    rows: [
      "............",
      "..########..",
      "..#......#..",
      "..#.----.#..",
      "..#......#..",
      "..#.----.#..",
      "..#......#..",
      "..#.---..#..",
      "..#......#..",
      "..########..",
      "............",
      "............",
    ],
  },
  /** A door out. */
  exit: {
    legend: { "#": PIXEL_MUTED },
    rows: [
      "............",
      "..#######...",
      "..#.....#...",
      "..#.....#...",
      "..#.....#...",
      "..#...#.#...",
      "..#.....#...",
      "..#.....#...",
      "..#.....#...",
      "..#######...",
      "............",
      "............",
    ],
  },
} satisfies Record<string, PixelGlyph>;

export type PixelIconName = keyof typeof GLYPHS;

export const PixelIcon = ({ name, size = 72 }: { name: PixelIconName; size?: number }) => {
  const glyph: PixelGlyph = GLYPHS[name];
  const height = glyph.rows.length;
  const width = glyph.rows[0].length;

  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {glyph.rows.map((row, y) =>
        row.split("").map((char, x) =>
          char === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={glyph.legend[char]} />
          ),
        ),
      )}
    </svg>
  );
};

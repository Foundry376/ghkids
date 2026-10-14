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
export const PIXEL_CORAL = "#e0645a";
export const PIXEL_TILE = "#fffdf7";

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
  /** A game controller — games other people made, ready to play. */
  play: {
    legend: { "#": PIXEL_INK, o: PIXEL_CORAL, "+": PIXEL_TILE },
    rows: [
      "............",
      "............",
      "..########..",
      ".#oooooooo#.",
      "#oo#oooo+oo#",
      "#o###oo+o+o#",
      "#oo#oooo+oo#",
      "#oooooooooo#",
      "#ooo####ooo#",
      ".###....###.",
      "............",
      "............",
    ],
  },
  /** A grown-up and a kid, side by side. */
  parents: {
    legend: { "#": PIXEL_MUTED },
    rows: [
      "............",
      "..##........",
      "..##........",
      "............",
      ".####...##..",
      ".####...##..",
      ".####.......",
      ".####..####.",
      ".#..#..####.",
      ".#..#..#..#.",
      ".#..#..#..#.",
      "............",
    ],
  },
  /** A magnifying glass, for finding things. */
  search: {
    legend: { "#": PIXEL_INK, o: PIXEL_CYAN },
    rows: [
      "............",
      "..####......",
      ".#oooo#.....",
      "#oooooo#....",
      "#oooooo#....",
      "#oooooo#....",
      "#oooooo#....",
      ".#oooo#.....",
      "..####.##...",
      ".......###..",
      "........###.",
      ".........##.",
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
  /** A play triangle — start a game. */
  go: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      "...#........",
      "...##.......",
      "...###......",
      "...####.....",
      "...#####....",
      "...#####....",
      "...####.....",
      "...###......",
      "...##.......",
      "...#........",
      "............",
    ],
  },
  /** A pencil — keep building a game. */
  edit: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      "........###.",
      ".......####.",
      "......####..",
      ".....####...",
      "....####....",
      "...####.....",
      "..####......",
      "..###.......",
      "..##........",
      ".#..........",
      "............",
    ],
  },
  /** Three dots, for a menu of more things to do. */
  more: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      "............",
      ".....##.....",
      ".....##.....",
      "............",
      ".....##.....",
      ".....##.....",
      "............",
      ".....##.....",
      ".....##.....",
      "............",
      "............",
    ],
  },
  /** A bin. */
  trash: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      "....####....",
      ".##########.",
      "............",
      "..########..",
      "..#.#..#.#..",
      "..#.#..#.#..",
      "..#.#..#.#..",
      "..#.#..#.#..",
      "..#.#..#.#..",
      "..########..",
      "............",
    ],
  },
  /** An arrow up out of a tray — send a game to your account. */
  upload: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      ".....##.....",
      "....####....",
      "...######...",
      "..##.##.##..",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      "............",
      ".#........#.",
      ".##########.",
      "............",
    ],
  },
  /** A plus — make something new. */
  plus: {
    legend: { "#": PIXEL_INK },
    rows: [
      "............",
      "............",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      "..########..",
      "..########..",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      "............",
      "............",
    ],
  },
  /** A screen — games kept on this computer. */
  computer: {
    legend: { "#": PIXEL_INK, o: PIXEL_CYAN },
    rows: [
      "............",
      ".##########.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".#oooooooo#.",
      ".##########.",
      ".....##.....",
      "...######...",
      "............",
      "............",
    ],
  },
  /** A picture frame with a hill and a sun — a game with no picture yet. */
  picture: {
    legend: { "#": PIXEL_MUTED },
    rows: [
      "............",
      ".##########.",
      ".#........#.",
      ".#.....##.#.",
      ".#.....##.#.",
      ".#........#.",
      ".#...#....#.",
      ".#..###...#.",
      ".#.#####.##.",
      ".##########.",
      "............",
      "............",
    ],
  },
  /** A question mark in a frame — a page that isn't there. */
  lost: {
    legend: { "#": PIXEL_INK, o: PIXEL_AMBER },
    rows: [
      "............",
      ".##########.",
      ".#........#.",
      ".#..oooo..#.",
      ".#.oo..oo.#.",
      ".#.....oo.#.",
      ".#....oo..#.",
      ".#...oo...#.",
      ".#........#.",
      ".#...oo...#.",
      ".##########.",
      "............",
    ],
  },
} satisfies Record<string, PixelGlyph>;

export type PixelIconName = keyof typeof GLYPHS;

export const PixelIcon = ({
  name,
  size = 72,
  tint,
  className,
}: {
  name: PixelIconName;
  size?: number;
  /** Paint every pixel this one color instead of the glyph's own palette —
   *  "currentColor" makes an icon inside a button follow the button's text. */
  tint?: string;
  className?: string;
}) => {
  const glyph: PixelGlyph = GLYPHS[name];
  const height = glyph.rows.length;
  const width = glyph.rows[0].length;

  return (
    <svg
      className={className ? `pixel-icon ${className}` : "pixel-icon"}
      width={size}
      height={size}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {glyph.rows.map((row, y) =>
        row
          .split("")
          .map((char, x) =>
            char === "." ? null : (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={tint ?? glyph.legend[char]}
              />
            ),
          ),
      )}
    </svg>
  );
};

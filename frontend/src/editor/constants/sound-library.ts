// CC0 sounds from Kenney (https://kenney.nl/assets), served from frontend/public/sound-library.
// Saved rules store these URLs, so files must not be renamed or removed.
export type LibrarySound = { label: string; url: string; tags: string[]; featured: boolean };

export const SOUND_LIBRARY_ATTRIBUTION = { label: "Kenney", url: "https://kenney.nl/assets" };

export const SOUND_LIBRARY: LibrarySound[] = [
  { label: "Coin", url: "/sound-library/coin.mp3", tags: ["pickup", "retro"], featured: true },
  { label: "Jump", url: "/sound-library/jump.mp3", tags: ["movement", "retro"], featured: true },
  {
    label: "Power Up",
    url: "/sound-library/power-up.mp3",
    tags: ["pickup", "retro"],
    featured: true,
  },
  {
    label: "Power Up 2",
    url: "/sound-library/power-up-2.mp3",
    tags: ["pickup", "retro"],
    featured: false,
  },
  { label: "Laser", url: "/sound-library/laser.mp3", tags: ["retro", "space"], featured: true },
  {
    label: "Laser 2",
    url: "/sound-library/laser-2.mp3",
    tags: ["retro", "space"],
    featured: false,
  },
  { label: "Zap", url: "/sound-library/zap.mp3", tags: ["retro", "space"], featured: false },
  { label: "Rise", url: "/sound-library/rise.mp3", tags: ["retro"], featured: false },
  { label: "Fall", url: "/sound-library/fall.mp3", tags: ["retro"], featured: false },
  { label: "Win", url: "/sound-library/win.mp3", tags: ["game", "retro"], featured: true },
  { label: "Lose", url: "/sound-library/lose.mp3", tags: ["game", "retro"], featured: true },
  { label: "Uh Oh", url: "/sound-library/uh-oh.mp3", tags: ["game", "retro"], featured: false },
  { label: "Punch", url: "/sound-library/punch.mp3", tags: ["hit"], featured: true },
  { label: "Bump", url: "/sound-library/bump.mp3", tags: ["hit"], featured: false },
  { label: "Clang", url: "/sound-library/clang.mp3", tags: ["hit"], featured: false },
  { label: "Knock", url: "/sound-library/knock.mp3", tags: ["hit"], featured: false },
  { label: "Clink", url: "/sound-library/clink.mp3", tags: ["hit"], featured: false },
  { label: "Bell", url: "/sound-library/bell.mp3", tags: ["hit", "game"], featured: false },
  { label: "Footstep", url: "/sound-library/footstep.mp3", tags: ["movement"], featured: false },
  { label: "Pop", url: "/sound-library/pop.mp3", tags: ["ui"], featured: true },
  { label: "Click", url: "/sound-library/click.mp3", tags: ["ui"], featured: false },
  { label: "Ding", url: "/sound-library/ding.mp3", tags: ["ui", "game"], featured: false },
  { label: "Buzz", url: "/sound-library/buzz.mp3", tags: ["ui", "game"], featured: false },
  { label: "Drop", url: "/sound-library/drop.mp3", tags: ["ui"], featured: false },
  { label: "Question", url: "/sound-library/question.mp3", tags: ["ui"], featured: false },
  { label: "Chime", url: "/sound-library/chime.mp3", tags: ["ui"], featured: false },
  { label: "Bong", url: "/sound-library/bong.mp3", tags: ["ui"], featured: false },
];

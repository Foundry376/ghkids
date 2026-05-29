export type BackgroundProviderKind = "tagged" | "search" | "generate";

export type BackgroundProvider = {
  key: string;
  label: string;
  kind: BackgroundProviderKind;
  attribution?: { label: string; url: string };
};

// Order here drives tab order in the BackgroundEditorModal.
export const BACKGROUND_PROVIDERS: BackgroundProvider[] = [
  {
    key: "craftpix",
    label: "Pixel Art",
    kind: "tagged",
    attribution: { label: "CraftPix.net", url: "https://craftpix.net/freebies/" },
  },
  {
    key: "unsplash",
    label: "Unsplash",
    kind: "search",
    attribution: { label: "Unsplash", url: "https://unsplash.com" },
  },
  {
    key: "generate",
    label: "Generate with AI",
    kind: "generate",
  },
];

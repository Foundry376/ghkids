import { createClient } from "@supabase/supabase-js";
import express from "express";

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "codako-assets";

// Allowlist of provider keys. Adding a new sound pack is a matter of uploading
// its assets + manifest to `${BUCKET}/sounds-${key}/` and adding the key here.
const PROVIDERS = ["kenney"] as const;
type ProviderKey = (typeof PROVIDERS)[number];

type ManifestSound = {
  file: string;
  label?: string;
  tags?: string[];
  featured?: boolean;
};

type Manifest = {
  attribution?: { label: string; url: string };
  sounds: ManifestSound[];
};

type ResolvedSound = {
  id: string;
  label: string;
  url: string;
  tags: string[];
  featured: boolean;
};

type CacheEntry = { fetchedAt: number; manifest: Manifest };
const CACHE_TTL_MS = 5 * 60 * 1000;
const manifestCache = new Map<ProviderKey, CacheEntry>();

const fetchManifest = async (provider: ProviderKey): Promise<Manifest> => {
  const cached = manifestCache.get(provider);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.manifest;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(`sounds-${provider}/manifest.json`);
  if (error || !data) {
    throw new Error(error?.message || `manifest.json not found for ${provider}`);
  }

  const text = await data.text();
  const manifest = JSON.parse(text) as Manifest;
  manifestCache.set(provider, { fetchedAt: Date.now(), manifest });
  return manifest;
};

const resolveSounds = (provider: ProviderKey, manifest: Manifest): ResolvedSound[] => {
  return manifest.sounds.map((sound) => {
    const path = `sounds-${provider}/${sound.file}`;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      id: sound.file,
      label: sound.label ?? sound.file.replace(/\.[^.]+$/, ""),
      url: data.publicUrl,
      tags: sound.tags ?? [],
      featured: sound.featured === true,
    };
  });
};

router.get("/sounds/:provider", async (req, res) => {
  const provider = req.params.provider as ProviderKey;
  if (!PROVIDERS.includes(provider)) {
    return res.status(404).json({ error: `Unknown provider: ${provider}` });
  }

  try {
    const manifest = await fetchManifest(provider);
    const sounds = resolveSounds(provider, manifest);
    const tagSet = new Set<string>();
    for (const sound of sounds) for (const t of sound.tags) tagSet.add(t);

    res.json({
      provider,
      attribution: manifest.attribution ?? null,
      tags: Array.from(tagSet).sort(),
      sounds,
    });
  } catch (err) {
    console.error(`Failed to load manifest for ${provider}:`, err);
    res.status(500).json({ error: `Failed to load ${provider} sounds` });
  }
});

export default router;

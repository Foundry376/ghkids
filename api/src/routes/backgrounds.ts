import { createClient } from "@supabase/supabase-js";
import express from "express";

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "codako-assets";

// Allowlist of provider keys. Adding a new tagged provider is a matter of
// uploading its assets + manifest to `${BUCKET}/${key}/` and adding the key here.
const PROVIDERS = ["craftpix"] as const;
type ProviderKey = (typeof PROVIDERS)[number];

type ManifestImage = {
  file: string;
  label?: string;
  tags?: string[];
  featured?: boolean;
};

type Manifest = {
  attribution?: { label: string; url: string };
  images: ManifestImage[];
};

type ResolvedImage = {
  id: string;
  label: string;
  fullUrl: string;
  thumbUrl: string;
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

  const { data, error } = await supabase.storage.from(BUCKET).download(`${provider}/manifest.json`);
  if (error || !data) {
    throw new Error(error?.message || `manifest.json not found for ${provider}`);
  }

  const text = await data.text();
  const manifest = JSON.parse(text) as Manifest;
  manifestCache.set(provider, { fetchedAt: Date.now(), manifest });
  return manifest;
};

const resolveImages = (provider: ProviderKey, manifest: Manifest): ResolvedImage[] => {
  return manifest.images.map((img) => {
    const path = `${provider}/${img.file}`;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      id: img.file,
      label: img.label ?? img.file.replace(/\.[^.]+$/, ""),
      fullUrl: data.publicUrl,
      thumbUrl: data.publicUrl,
      tags: img.tags ?? [],
      featured: img.featured === true,
    };
  });
};

router.get("/backgrounds/:provider", async (req, res) => {
  const provider = req.params.provider as ProviderKey;
  if (!PROVIDERS.includes(provider)) {
    return res.status(404).json({ error: `Unknown provider: ${provider}` });
  }

  try {
    const manifest = await fetchManifest(provider);
    const images = resolveImages(provider, manifest);
    const tagSet = new Set<string>();
    for (const img of images) for (const t of img.tags) tagSet.add(t);

    res.json({
      provider,
      attribution: manifest.attribution ?? null,
      tags: Array.from(tagSet).sort(),
      images,
    });
  } catch (err) {
    console.error(`Failed to load manifest for ${provider}:`, err);
    res.status(500).json({ error: `Failed to load ${provider} backgrounds` });
  }
});

export default router;

/**
 * Upload a provider's background pack to Supabase Storage.
 *
 * Takes a local folder containing a `manifest.json` plus the image files it
 * references, and uploads them to `<bucket>/<provider>/` so the
 * `GET /backgrounds/:provider` API route can serve them.
 *
 * Usage:
 *   cd scripts && yarn install
 *   SUPABASE_URL=... SUPABASE_KEY=... \
 *     yarn upload-backgrounds --provider craftpix --dir ./craftpix-pack
 *
 * Options:
 *   --provider NAME   Provider key (becomes the folder name in the bucket). Required.
 *   --dir PATH        Local folder containing manifest.json + images. Required.
 *   --bucket NAME     Supabase bucket (default: codako-assets).
 *   --dry-run         List what would be uploaded without doing it.
 *
 * Environment:
 *   SUPABASE_URL  Supabase project URL (required)
 *   SUPABASE_KEY  Service role key with Storage write access (required)
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out: {
    provider?: string;
    dir?: string;
    bucket: string;
    dryRun: boolean;
  } = {
    bucket: "codako-assets",
    dryRun: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--provider") out.provider = args[++i];
    else if (a === "--dir") out.dir = args[++i];
    else if (a === "--bucket") out.bucket = args[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  if (!out.provider || !out.dir) {
    console.error(
      "Usage: yarn upload-backgrounds --provider NAME --dir PATH [--bucket NAME] [--dry-run]",
    );
    process.exit(1);
  }
  return out as Required<Omit<typeof out, "dryRun">> & { dryRun: boolean };
};

const main = async () => {
  const { provider, dir, bucket, dryRun } = parseArgs();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    console.error(
      "SUPABASE_URL and SUPABASE_KEY must be set in the environment.",
    );
    process.exit(1);
  }

  const absDir = path.resolve(dir);
  if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
    console.error(`Directory not found: ${absDir}`);
    process.exit(1);
  }

  const manifestPath = path.join(absDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`manifest.json not found at ${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf8"),
  ) as Manifest;
  if (!Array.isArray(manifest.images)) {
    console.error("manifest.json must contain an `images` array.");
    process.exit(1);
  }

  // Validate every referenced file exists, refuse to proceed otherwise — we
  // don't want a half-uploaded provider where the manifest points at 404s.
  const missing = manifest.images.filter(
    (img) => !fs.existsSync(path.join(absDir, img.file)),
  );
  if (missing.length > 0) {
    console.error("Missing image files referenced by manifest.json:");
    for (const m of missing) console.error(`  - ${m.file}`);
    process.exit(1);
  }

  console.log(`Supabase URL: ${url}`);
  console.log(`Supabase key: ${key.slice(0, 10)}...${key.slice(-4)}`);
  console.log(`Node version: ${process.version}`);

  // Quick connectivity check before we attempt uploads
  try {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    console.log(`Connectivity check: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`  Response body: ${body}`);
    }
  } catch (err: any) {
    console.error(`Connectivity check failed: ${err.message}`);
    if (err.cause) console.error(`  Cause:`, err.cause);
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // manifest.json gets uploaded last so the API never serves a manifest that
  // points at files which haven't landed yet.
  const uploads: {
    localPath: string;
    remotePath: string;
    contentType: string;
  }[] = [];
  for (const img of manifest.images) {
    const ext = path.extname(img.file).toLowerCase();
    uploads.push({
      localPath: path.join(absDir, img.file),
      remotePath: `${provider}/${img.file}`,
      contentType: MIME_BY_EXT[ext] ?? "application/octet-stream",
    });
  }
  uploads.push({
    localPath: manifestPath,
    remotePath: `${provider}/manifest.json`,
    contentType: "application/json",
  });

  console.log(
    `${dryRun ? "[dry-run] " : ""}Uploading ${uploads.length} files to ${bucket}/${provider}/`,
  );

  for (const u of uploads) {
    const rel = path.relative(absDir, u.localPath);
    if (dryRun) {
      console.log(`  ${rel}  ->  ${u.remotePath}  (${u.contentType})`);
      continue;
    }
    const buf = fs.readFileSync(u.localPath);
    const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
    console.log(`  ${rel} (${sizeMB} MB) -> ${u.remotePath}`);
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(u.remotePath, buf, {
          contentType: u.contentType,
          upsert: true,
        });
      if (error) {
        console.error(`  FAILED ${rel}: ${error.message}`);
        console.error(
          `    Supabase error details:`,
          JSON.stringify(error, null, 2),
        );
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`  FAILED ${rel}: ${err.message}`);
      if (err.cause) console.error(`    Cause:`, err.cause);
      console.error(`    Stack:`, err.stack);
      process.exit(1);
    }
  }

  console.log(dryRun ? "Dry run complete." : "Done.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

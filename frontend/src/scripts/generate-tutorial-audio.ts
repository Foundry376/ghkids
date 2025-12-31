/**
 * Generate tutorial audio files using ElevenLabs TTS API.
 *
 * This script parses tutorial-content.ts directly to extract text and audio
 * file mappings, so there's no need for a separate data file.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=your_key yarn generate-tutorial-audio
 *
 * Options:
 *   --dry-run     Show what would be generated without making API calls
 *   --voice ID    Use a specific ElevenLabs voice ID
 *   --force       Regenerate all files even if they exist
 *   --only FILE   Only generate a specific file (e.g. "base_01.mp3")
 *
 * Environment:
 *   ELEVENLABS_API_KEY  Your ElevenLabs API key (required)
 *   ELEVENLABS_VOICE_ID Override the default voice
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SOUNDS_DIR = path.resolve(__dirname, "../editor/sounds/tutorial");
const CONTENT_FILE = path.resolve(__dirname, "../editor/constants/tutorial-content.ts");

// ElevenLabs configuration
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// Default voice - "Rachel" is a good quality voice. You can change this to a child voice ID.
// Some options:
// - "21m00Tcm4TlvDq8ikWAM" = Rachel (default, female)
// - "AZnzlk1XvdvUeBnXmlld" = Domi (female)
// - "EXAVITQu4vr4xnSDxMaL" = Bella (female)
// - "ErXwobaYiN019PkySvjV" = Antoni (male)
// - "MF3mGyEYCl7XYWbV9V6O" = Elli (female)
// - "TxGEqnHWrfWFTfGW9XjX" = Josh (male)
// - "VR6AewLTigWG4xSOukaG" = Arnold (male)
// - "pNInz6obpgDQGcFmaJgB" = Adam (male)
// - "yoZ06aMxZJJ28mfd3POQ" = Sam (male)
//
// For child voices, you may need to:
// 1. Use ElevenLabs voice cloning to create a child voice
// 2. Use the "Voice Design" feature to create a custom child voice
// 3. Check ElevenLabs voice library for community child voices
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

// Voice settings for more natural speech
const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

interface TutorialAudioStep {
  text: string;
  audioFile: string;
}

interface GenerationOptions {
  dryRun: boolean;
  force: boolean;
  voiceId: string;
  onlyFile?: string;
}

function parseArgs(): GenerationOptions {
  const args = process.argv.slice(2);
  const options: GenerationOptions = {
    dryRun: false,
    force: false,
    voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
    onlyFile: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--voice" && args[i + 1]) {
      options.voiceId = args[++i]!;
    } else if (arg === "--only" && args[i + 1]) {
      options.onlyFile = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Generate tutorial audio files using ElevenLabs TTS API.

Usage:
  ELEVENLABS_API_KEY=your_key yarn generate-tutorial-audio [options]

Options:
  --dry-run     Show what would be generated without making API calls
  --voice ID    Use a specific ElevenLabs voice ID (default: ${DEFAULT_VOICE_ID})
  --force       Regenerate all files even if they exist
  --only FILE   Only generate a specific file (e.g. "base_01.mp3")
  --help, -h    Show this help message

Environment:
  ELEVENLABS_API_KEY   Your ElevenLabs API key (required)
  ELEVENLABS_VOICE_ID  Override the default voice ID
`);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Extract the content of a template literal, handling escaped backticks.
 */
function extractTemplateLiteral(content: string, startIndex: number): { text: string; endIndex: number } | null {
  if (content[startIndex] !== "`") {
    return null;
  }

  let i = startIndex + 1;
  let result = "";

  while (i < content.length) {
    const char = content[i];

    if (char === "\\") {
      // Escaped character - include both the backslash and next char
      result += content[i + 1] || "";
      i += 2;
    } else if (char === "`") {
      // End of template literal
      return { text: result, endIndex: i };
    } else {
      result += char;
      i++;
    }
  }

  return null; // Unclosed template literal
}

/**
 * Parse tutorial-content.ts to extract text and audioFile mappings.
 * This avoids needing a separate data file - the content file is the source of truth.
 */
function parseTutorialContent(): TutorialAudioStep[] {
  const content = fs.readFileSync(CONTENT_FILE, "utf-8");
  const steps: TutorialAudioStep[] = [];

  // Find all occurrences of "text:" followed by a template literal
  const textPattern = /\btext:\s*`/g;
  let textMatch;

  while ((textMatch = textPattern.exec(content)) !== null) {
    const backtickIndex = textMatch.index + textMatch[0].length - 1;
    const extracted = extractTemplateLiteral(content, backtickIndex);

    if (!extracted) {
      continue;
    }

    // Look for audioFile in the same object (within reasonable distance after the text)
    // Search forward from the end of the text for audioFile
    const searchRegion = content.slice(extracted.endIndex, extracted.endIndex + 500);
    const audioFileMatch = searchRegion.match(/\baudioFile:\s*"([^"]+)"/);

    if (audioFileMatch) {
      // Clean up the text: normalize whitespace
      const cleanedText = extracted.text.replace(/\s+/g, " ").trim();
      steps.push({ text: cleanedText, audioFile: audioFileMatch[1]! });
    }
  }

  return steps;
}

async function generateAudio(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Buffer> {
  const url = `${ELEVENLABS_API_URL}/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: VOICE_SETTINGS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function getStepsToGenerate(
  steps: TutorialAudioStep[],
  options: GenerationOptions
): { step: TutorialAudioStep; filePath: string }[] {
  const result: { step: TutorialAudioStep; filePath: string }[] = [];

  for (const step of steps) {
    if (options.onlyFile && step.audioFile !== options.onlyFile) {
      continue;
    }

    const filePath = path.join(SOUNDS_DIR, step.audioFile);

    // Skip if file exists and not forcing
    if (!options.force && fs.existsSync(filePath)) {
      continue;
    }

    result.push({ step, filePath });
  }

  return result;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs();
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey && !options.dryRun) {
    console.error("Error: ELEVENLABS_API_KEY environment variable is required");
    console.error(
      "Set it with: ELEVENLABS_API_KEY=your_key yarn generate-tutorial-audio"
    );
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  }

  // Parse the tutorial content file directly
  console.log(`Parsing ${path.basename(CONTENT_FILE)}...`);
  const allStepsData = parseTutorialContent();
  console.log(`Found ${allStepsData.length} steps with audio files.\n`);

  // Filter to steps that need generation
  const stepsToGenerate = getStepsToGenerate(allStepsData, options);

  if (stepsToGenerate.length === 0) {
    console.log("No audio files to generate.");
    if (!options.force) {
      console.log("Use --force to regenerate existing files.");
    }
    return;
  }

  console.log(`Tutorial Audio Generator`);
  console.log(`========================`);
  console.log(`Voice ID: ${options.voiceId}`);
  console.log(`Output directory: ${SOUNDS_DIR}`);
  console.log(`Files to generate: ${stepsToGenerate.length}`);
  console.log(`Mode: ${options.dryRun ? "DRY RUN" : "LIVE"}\n`);

  let generated = 0;
  let failed = 0;

  for (const { step, filePath } of stepsToGenerate) {
    const filename = path.basename(filePath);
    const truncatedText =
      step.text.length > 60 ? step.text.slice(0, 60) + "..." : step.text;

    console.log(`[${generated + failed + 1}/${stepsToGenerate.length}] ${filename}`);
    console.log(`    "${truncatedText}"`);

    if (options.dryRun) {
      console.log(`    -> Would generate (dry run)\n`);
      generated++;
      continue;
    }

    try {
      const audioBuffer = await generateAudio(step.text, options.voiceId, apiKey!);
      fs.writeFileSync(filePath, audioBuffer);
      console.log(
        `    -> Generated ${(audioBuffer.length / 1024).toFixed(1)}KB\n`
      );
      generated++;

      // Rate limiting: ElevenLabs has rate limits, add a small delay
      await sleep(500);
    } catch (error) {
      console.error(
        `    -> ERROR: ${error instanceof Error ? error.message : error}\n`
      );
      failed++;
    }
  }

  console.log(`\n========================`);
  console.log(`Generated: ${generated}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

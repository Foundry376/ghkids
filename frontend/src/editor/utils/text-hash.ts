/**
 * Simple hash function for generating consistent audio filenames from text.
 * Uses djb2 algorithm - fast, simple, and produces reasonably unique hashes.
 *
 * This is used by:
 * - tutorial-content.ts to generate audio file references
 * - scripts/generate-tutorial-audio.ts to generate audio files with matching names
 */

export function hashText(text: string): string {
  // Normalize the text: collapse whitespace, trim, lowercase
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();

  // djb2 hash algorithm
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }

  // Convert to base36 and take first 12 characters for a reasonably short filename
  // Use unsigned 32-bit to ensure positive number
  const unsignedHash = hash >>> 0;
  return unsignedHash.toString(36).padStart(7, "0");
}

/**
 * Generate an audio filename from tutorial text.
 */
export function getAudioFilename(text: string): string {
  return `audio_${hashText(text)}.mp3`;
}

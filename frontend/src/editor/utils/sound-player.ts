import { Characters, RuleTreeItem } from "../../types";
import { findRules } from "./stage-helpers";

/**
 * Plays the sounds fired by "sound" rule actions.
 *
 * Rule sounds start from the tick timer, not from a tap, and iOS Safari refuses
 * to start an <audio> element without one. So sounds go through a single Web
 * Audio context instead: it's resumed on the first tap or key press anywhere on
 * the page (the Play button, opening the editor...), and after that it can play
 * decoded buffers from any timer. Decoded buffers are cached per URL, which is
 * also what lets a game preload its sounds when it opens.
 *
 * If Web Audio isn't available or a sound can't be fetched (e.g. a host
 * without CORS headers), we fall back to a plain <audio> element.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function getContext() {
  if (context) return context;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return null;
  context = new Ctor();
  return context;
}

const UNLOCK_EVENTS = ["pointerdown", "touchend", "keydown", "click"] as const;

function unlock() {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state !== "running") {
    ctx.resume().catch(() => undefined);
    // Older iOS only unlocks once something has actually played in the gesture.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  }
  if (ctx.state === "running") {
    UNLOCK_EVENTS.forEach((type) => document.removeEventListener(type, unlock, true));
  }
}

if (typeof document !== "undefined") {
  UNLOCK_EVENTS.forEach((type) => document.addEventListener(type, unlock, true));
}

function loadBuffer(url: string) {
  let pending = buffers.get(url);
  if (!pending) {
    const ctx = getContext();
    pending = ctx
      ? fetch(url)
          .then((resp) => {
            if (!resp.ok) throw new Error(`${resp.status}`);
            return resp.arrayBuffer();
          })
          .then((data) => ctx.decodeAudioData(data))
          .catch(() => null)
      : Promise.resolve(null);
    buffers.set(url, pending);
  }
  return pending;
}

function playWithAudioElement(url: string) {
  new Audio(url).play().catch(() => {
    // Ignore autoplay rejections and unreachable sounds
  });
}

export function playSound(url: string) {
  const ctx = getContext();
  if (!ctx) {
    playWithAudioElement(url);
    return;
  }
  loadBuffer(url).then((buffer) => {
    if (!buffer) {
      playWithAudioElement(url);
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  });
}

/** Fetch and decode sounds ahead of time so the first play isn't delayed. */
export function preloadSounds(urls: Iterable<string>) {
  if (!getContext()) return;
  for (const url of urls) {
    loadBuffer(url);
  }
}

/** Every URL a "sound" action in these characters' rules can play. */
export function soundUrlsForCharacters(characters: Characters) {
  const urls = new Set<string>();
  for (const character of Object.values(characters)) {
    for (const { rule } of findRules(character, (item: RuleTreeItem) => "actions" in item)) {
      if (!("actions" in rule)) continue;
      for (const action of rule.actions) {
        if (action.type === "sound") urls.add(action.url);
      }
    }
  }
  return urls;
}

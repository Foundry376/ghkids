import { Actor, RuleActionAnimationStyle } from "../../types";
import { deepClone } from "./utils";

export type FrameActor = Actor & {
  deleted?: boolean;
  actionIdx?: number;
  animationStyle?: RuleActionAnimationStyle;
};
export type Frame = { actors: { [actorId: string]: FrameActor }; id: number };

// Upper bound on the number of frames in a tick's shared timeline. The exact
// timeline length is the least-common-multiple of every actor's frame count so
// that each actor's changes land on integer slots, but coprime counts can make
// the LCM explode (e.g. 7 and 11 => 77). Past this cap we round slot positions
// instead; the resulting sub-frame jitter is imperceptible.
const MAX_TIMELINE_FRAMES = 100;

const gcd = (a: number, b: number): number => {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
};

const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;

export class FrameAccumulator {
  changes: { [actorId: string]: FrameActor[] } = {};
  initial: Frame;

  constructor(actors: { [actorId: string]: FrameActor }) {
    this.initial = { actors, id: Date.now() };
  }
  push(actor: FrameActor) {
    this.changes[actor.id] ||= [];
    this.changes[actor.id].push(deepClone(actor));
  }
  getFrames() {
    // Distribute every actor's changes across a single shared timeline so that
    // each actor's N changes are spread evenly over the whole tick (at fractions
    // 0, 1/N, 2/N, ... of the duration) rather than bunched into the first N
    // frames. The playback loop advances all actors on one clock at
    // `speed / frames.length`, while each actor's CSS transition lasts
    // `speed / frameCount` (its own change count). For an actor's transitions to
    // line up with when its changes are actually delivered, change `j` of an
    // actor with `k` changes must land on slot `j * frames.length / k`. Making
    // the timeline length the LCM of all change counts keeps those slots integral.
    const frameCountsByActor = Object.fromEntries(
      Object.entries(this.changes).map(([id, a]) => [id, a.length]),
    );
    const counts = Object.values(frameCountsByActor);

    // No rules fired: return just the initial frame so the tick clock still
    // receives a new unique tickKey on every tick.
    if (counts.length === 0) {
      return [this.initial];
    }

    const total = Math.min(
      counts.reduce((acc, count) => lcm(acc, count), 1),
      MAX_TIMELINE_FRAMES,
    );

    // Bucket each change onto its proportional slot in the shared timeline.
    const changesBySlot: { actorId: string; version: FrameActor }[][] = Array.from(
      { length: total },
      () => [],
    );
    for (const [actorId, versions] of Object.entries(this.changes)) {
      const count = versions.length;
      versions.forEach((version, j) => {
        const slot = Math.min(Math.round((j * total) / count), total - 1);
        const placed = deepClone(version);
        placed.frameCount = count;
        changesBySlot[slot].push({ actorId, version: placed });
      });
    }

    const frames: Frame[] = [];
    let current: Frame = deepClone(this.initial);
    for (let slot = 0; slot < total; slot++) {
      for (const { actorId, version } of changesBySlot[slot]) {
        if (version.deleted) {
          delete current.actors[actorId];
        } else {
          current.actors[actorId] = version;
        }
      }
      // Use integer increment to avoid floating point precision issues
      current.id = this.initial.id + slot;
      frames.push(current);
      current = deepClone(current);
    }

    return frames;
  }
}

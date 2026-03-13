import { Actor, RuleActionAnimationStyle } from "../../types";
import { deepClone } from "./utils";

export type FrameActor = Actor & {
  deleted?: boolean;
  actionIdx?: number;
  animationStyle?: RuleActionAnimationStyle;
};
export type Frame = { actors: { [actorId: string]: FrameActor }; id: number };

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
    // Spread each actor's changes evenly across the total frame count so that
    // actors with fewer changes animate over the full tick duration rather than
    // finishing early and sitting idle. This ensures CSS transition durations
    // (speed / frameCount) match the frame stepping interval (speed / totalFrames).
    const changeLengths = Object.values(this.changes).map((a) => a.length);
    const totalFrames = Math.max(0, ...changeLengths);

    if (totalFrames === 0) {
      // Always return at least the initial frame so that the tick clock
      // receives a new unique tickKey on every tick, even when no rules fire.
      return [this.initial];
    }

    // Build a schedule mapping each actor's changes to evenly-spaced frame indices.
    // An actor with N changes over M total frames maps change i to frame:
    //   round(i * (M - 1) / (N - 1))  when N > 1, or frame 0 when N = 1
    const schedule: { [actorId: string]: { [frameIdx: number]: FrameActor } } = {};
    for (const [actorId, actorChanges] of Object.entries(this.changes)) {
      schedule[actorId] = {};
      const n = actorChanges.length;
      for (let i = 0; i < n; i++) {
        const frameIdx = n === 1 ? 0 : Math.round((i * (totalFrames - 1)) / (n - 1));
        actorChanges[i].frameCount = totalFrames;
        schedule[actorId][frameIdx] = actorChanges[i];
      }
    }

    const frames: Frame[] = [];
    let current: Frame = deepClone(this.initial);

    for (let f = 0; f < totalFrames; f++) {
      for (const actorId of Object.keys(schedule)) {
        const change = schedule[actorId][f];
        if (change) {
          if (change.deleted) {
            delete current.actors[actorId];
          } else {
            current.actors[actorId] = change;
          }
        }
      }
      frames.push(current);
      current = deepClone(current);
      // Use integer increment to avoid floating point precision issues
      current.id = this.initial.id + f + 1;
    }

    return frames;
  }
}

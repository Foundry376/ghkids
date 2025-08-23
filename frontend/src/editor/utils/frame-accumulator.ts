import { Actor } from "../../types";
import { deepClone } from "./utils";

export type FrameActor = Actor & { deleted?: boolean };
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
    // Perform the first action for each actor in the first frame, then the second action
    // for each actor, etc. until there are no more actions to perform.
    const frames: Frame[] = [];
    const remaining = { ...this.changes };
    const frameCountsByActor = Object.fromEntries(
      Object.entries(this.changes).map(([id, a]) => [id, a.length]),
    );

    let current: Frame = deepClone(this.initial);

    while (true) {
      const changeActorIds = Object.keys(remaining);
      if (changeActorIds.length === 0) {
        break;
      }
      for (const actorId of changeActorIds) {
        const actorVersion = remaining[actorId].shift()!;
        actorVersion.frameCount = frameCountsByActor[actorId];
        if (actorVersion.deleted) {
          delete current.actors[actorId];
        } else {
          current.actors[actorId] = actorVersion;
        }
        if (remaining[actorId].length === 0) {
          delete remaining[actorId];
        }
      }
      frames.push(current);
      current = deepClone(current);
      current.id += 0.1;
    }
    return frames;
  }
}

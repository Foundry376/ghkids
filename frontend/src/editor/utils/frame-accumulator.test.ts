import { expect } from "chai";
import { FrameAccumulator } from "./frame-accumulator";
import { Actor } from "../../types";

describe("FrameAccumulator", () => {
  const makeActor = (id: string, x: number, y: number): Actor => ({
    id,
    characterId: "char1",
    variableValues: {},
    appearance: "app1",
    position: { x, y },
  });

  describe("constructor", () => {
    it("should store initial actors", () => {
      const actors = {
        actor1: makeActor("actor1", 0, 0),
        actor2: makeActor("actor2", 1, 1),
      };
      const accumulator = new FrameAccumulator(actors);
      expect(accumulator.initial.actors).to.equal(actors);
    });

    it("should initialize with empty changes", () => {
      const accumulator = new FrameAccumulator({});
      expect(accumulator.changes).to.deep.equal({});
    });
  });

  describe("push", () => {
    it("should accumulate changes for single actor", () => {
      const accumulator = new FrameAccumulator({});
      const actor = makeActor("actor1", 0, 0);
      accumulator.push(actor);
      expect(accumulator.changes["actor1"]).to.have.length(1);
    });

    it("should accumulate multiple changes for same actor", () => {
      const accumulator = new FrameAccumulator({});
      accumulator.push(makeActor("actor1", 0, 0));
      accumulator.push(makeActor("actor1", 1, 0));
      accumulator.push(makeActor("actor1", 2, 0));
      expect(accumulator.changes["actor1"]).to.have.length(3);
    });

    it("should track changes for multiple actors", () => {
      const accumulator = new FrameAccumulator({});
      accumulator.push(makeActor("actor1", 0, 0));
      accumulator.push(makeActor("actor2", 1, 1));
      expect(Object.keys(accumulator.changes)).to.have.length(2);
    });

    it("should deep clone actors to prevent mutation", () => {
      const accumulator = new FrameAccumulator({});
      const actor = makeActor("actor1", 0, 0);
      accumulator.push(actor);
      actor.position.x = 999;
      expect(accumulator.changes["actor1"][0].position.x).to.equal(0);
    });
  });

  describe("getFrames", () => {
    it("should return initial frame when no changes", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);
      const frames = accumulator.getFrames();
      expect(frames).to.have.length(1);
      expect(frames[0].actors).to.deep.equal(actors);
    });

    it("should return single frame for single actor single change", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);
      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });

      const frames = accumulator.getFrames();
      expect(frames).to.have.length(1);
      expect(frames[0].actors["actor1"].position).to.deep.equal({ x: 1, y: 0 });
    });

    it("should interleave frames for multiple actors with same action count", () => {
      const actors = {
        actor1: makeActor("actor1", 0, 0),
        actor2: makeActor("actor2", 5, 5),
      };
      const accumulator = new FrameAccumulator(actors);

      // Both actors have 2 actions each
      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor1", 2, 0), actionIdx: 1 });
      accumulator.push({ ...makeActor("actor2", 6, 5), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor2", 7, 5), actionIdx: 1 });

      const frames = accumulator.getFrames();
      expect(frames).to.have.length(2);

      // Frame 1: first action of each actor
      expect(frames[0].actors["actor1"].position).to.deep.equal({ x: 1, y: 0 });
      expect(frames[0].actors["actor2"].position).to.deep.equal({ x: 6, y: 5 });

      // Frame 2: second action of each actor
      expect(frames[1].actors["actor1"].position).to.deep.equal({ x: 2, y: 0 });
      expect(frames[1].actors["actor2"].position).to.deep.equal({ x: 7, y: 5 });
    });

    it("should handle actors with different action counts", () => {
      const actors = {
        actor1: makeActor("actor1", 0, 0),
        actor2: makeActor("actor2", 5, 5),
      };
      const accumulator = new FrameAccumulator(actors);

      // actor1 has 3 actions, actor2 has 1 action
      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor1", 2, 0), actionIdx: 1 });
      accumulator.push({ ...makeActor("actor1", 3, 0), actionIdx: 2 });
      accumulator.push({ ...makeActor("actor2", 6, 5), actionIdx: 0 });

      const frames = accumulator.getFrames();
      expect(frames).to.have.length(3);

      // Frame 1: first action of each
      expect(frames[0].actors["actor1"].position.x).to.equal(1);
      expect(frames[0].actors["actor2"].position.x).to.equal(6);

      // Frame 2: actor1 continues, actor2 stays at last position
      expect(frames[1].actors["actor1"].position.x).to.equal(2);
      expect(frames[1].actors["actor2"].position.x).to.equal(6);

      // Frame 3: actor1 finishes
      expect(frames[2].actors["actor1"].position.x).to.equal(3);
      expect(frames[2].actors["actor2"].position.x).to.equal(6);
    });

    it("should handle deleted actors", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);

      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 1, deleted: true });

      const frames = accumulator.getFrames();
      expect(frames).to.have.length(2);
      expect(frames[0].actors["actor1"]).to.exist;
      expect(frames[1].actors["actor1"]).to.be.undefined;
    });

    it("should set frameCount on each actor version", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);

      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor1", 2, 0), actionIdx: 1 });
      accumulator.push({ ...makeActor("actor1", 3, 0), actionIdx: 2 });

      const frames = accumulator.getFrames();
      expect(frames[0].actors["actor1"].frameCount).to.equal(3);
      expect(frames[1].actors["actor1"].frameCount).to.equal(3);
      expect(frames[2].actors["actor1"].frameCount).to.equal(3);
    });

    it("should generate unique frame IDs", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);

      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });
      accumulator.push({ ...makeActor("actor1", 2, 0), actionIdx: 1 });

      const frames = accumulator.getFrames();
      expect(frames[0].id).to.not.equal(frames[1].id);
    });

    it("should preserve actors not in changes", () => {
      const actors = {
        actor1: makeActor("actor1", 0, 0),
        actor2: makeActor("actor2", 5, 5),
      };
      const accumulator = new FrameAccumulator(actors);

      // Only actor1 has changes
      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0 });

      const frames = accumulator.getFrames();
      expect(frames[0].actors["actor1"].position.x).to.equal(1);
      expect(frames[0].actors["actor2"].position.x).to.equal(5);
    });

    it("should handle newly created actors (not in initial)", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);

      // New actor created during tick
      accumulator.push({ ...makeActor("actor2", 3, 3), actionIdx: 0 });

      const frames = accumulator.getFrames();
      expect(frames).to.have.length(1);
      expect(frames[0].actors["actor2"]).to.exist;
      expect(frames[0].actors["actor2"].position).to.deep.equal({ x: 3, y: 3 });
    });

    it("should preserve animationStyle on frame actors", () => {
      const actors = { actor1: makeActor("actor1", 0, 0) };
      const accumulator = new FrameAccumulator(actors);

      accumulator.push({ ...makeActor("actor1", 1, 0), actionIdx: 0, animationStyle: "linear" });

      const frames = accumulator.getFrames();
      expect(frames[0].actors["actor1"].animationStyle).to.equal("linear");
    });
  });
});

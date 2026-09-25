import { expect } from "chai";

import { Actor, Character } from "../../../../types";
import { actorLabel, inLabelOrder } from "./rule-actors";

const coach = { id: "coach", name: "Coach" } as Character;
const engine = { id: "engine", name: "Engine" } as Character;

const actor = (id: string, characterId: string, x: number, y: number): Actor => ({
  id,
  characterId,
  position: { x, y },
  appearance: "idle",
  variableValues: {},
});

describe("actorLabel", () => {
  it("uses the plain name when the rule has one of that character", () => {
    const a = actor("a", "coach", 3, 2);
    const e = actor("e", "engine", 4, 2);
    const actors = inLabelOrder({ a, e });
    expect(actorLabel(coach, a, actors)).to.equal("Coach");
    expect(actorLabel(engine, e, actors)).to.equal("Engine");
  });

  it("numbers same-character actors in reading order", () => {
    const right = actor("right", "coach", 5, 2);
    const left = actor("left", "coach", 3, 2);
    const above = actor("above", "coach", 9, 3);
    const actors = inLabelOrder({ right, left, above });
    expect(actorLabel(coach, above, actors)).to.equal("Coach 1");
    expect(actorLabel(coach, left, actors)).to.equal("Coach 2");
    expect(actorLabel(coach, right, actors)).to.equal("Coach 3");
  });

  it("labels the recording and the saved rule the same way", () => {
    // While recording, positions are on the stage...
    const recording = { lead: actor("lead", "coach", 6, 4), tail: actor("tail", "coach", 5, 4) };
    // ...and once saved they're relative to the main actor.
    const saved = { lead: actor("lead", "coach", 1, 0), tail: actor("tail", "coach", 0, 0) };
    for (const id of ["lead", "tail"] as const) {
      expect(actorLabel(coach, recording[id], inLabelOrder(recording))).to.equal(
        actorLabel(coach, saved[id], inLabelOrder(saved)),
      );
    }
  });

  it("goes by the before picture, not where the actor has moved to", () => {
    const before = inLabelOrder({
      lead: actor("lead", "coach", 6, 4),
      tail: actor("tail", "coach", 5, 4),
    });
    // The tail car in the after picture, moved past the lead.
    const movedTail = actor("tail", "coach", 7, 4);
    expect(actorLabel(coach, movedTail, before)).to.equal("Coach 1");
  });

  it("numbers an actor the rule creates after the ones already in it", () => {
    const a = actor("a", "coach", 1, 1);
    const b = actor("b", "coach", 2, 1);
    const created = actor("new", "coach", 0, 5);
    const actors = [...inLabelOrder({ a, b }), created];
    expect(actorLabel(coach, created, actors)).to.equal("Coach 3");
    expect(actorLabel(coach, a, actors)).to.equal("Coach 1");
  });

  it("uses the plain name for an actor it doesn't know about", () => {
    const actors = inLabelOrder({ a: actor("a", "coach", 1, 1), b: actor("b", "coach", 2, 1) });
    expect(actorLabel(coach, actor("other", "coach", 3, 1), actors)).to.equal("Coach");
  });

  it("uses the plain name outside of a rule", () => {
    expect(actorLabel(coach, actor("a", "coach", 1, 1), null)).to.equal("Coach");
  });
});

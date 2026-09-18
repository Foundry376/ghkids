import { expect } from "chai";
import { RuleTreeFlowItem } from "../../../types";
import { changesForFlowBehavior } from "./flow-group-behavior";

function makeGroup(overrides: Partial<RuleTreeFlowItem> = {}): RuleTreeFlowItem {
  return {
    type: "group-flow",
    id: "group",
    name: "Group",
    behavior: "first",
    rules: [],
    ...overrides,
  } as RuleTreeFlowItem;
}

describe("changesForFlowBehavior", () => {
  it("adds the default count when repeat mode is selected without one", () => {
    expect(changesForFlowBehavior(makeGroup(), "loop")).to.deep.equal({
      behavior: "loop",
      loopCount: { constant: 2 },
    });
  });

  it("preserves the existing count when repeat mode remains selected", () => {
    const group = makeGroup({ behavior: "loop", loopCount: { constant: 5 } });

    expect(changesForFlowBehavior(group, "loop")).to.deep.equal({
      behavior: "loop",
      loopCount: { constant: 5 },
    });
  });

  for (const behavior of ["first", "all", "random"] as const) {
    it(`removes the repeat count when ${behavior} mode is selected`, () => {
      const group = makeGroup({ behavior: "loop", loopCount: { constant: 2 } });

      expect(changesForFlowBehavior(group, behavior)).to.deep.equal({
        behavior,
        loopCount: undefined,
      });
    });
  }
});

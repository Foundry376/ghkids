import { expect } from "chai";
import { canonicalKey } from "./keys";

describe("canonicalKey", () => {
  it("migrates legacy numeric key codes", () => {
    expect(canonicalKey(39)).to.equal("ArrowRight");
    expect(canonicalKey(32)).to.equal("Space");
    expect(canonicalKey(65)).to.equal("A");
    expect(canonicalKey(188)).to.equal(",");
  });

  it("normalizes keyboard letters and space", () => {
    expect(canonicalKey("a")).to.equal("A");
    expect(canonicalKey("A")).to.equal("A");
    expect(canonicalKey(" ")).to.equal("Space");
  });

  it("does not confuse number keys with numeric key codes", () => {
    expect(canonicalKey("9")).to.equal("9");
  });
});

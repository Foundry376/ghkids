import { expect } from "chai";
import { Stage, StageVariable } from "../../types";
import {
  BUILTIN_STAGE_VARIABLES,
  BUILTIN_STAGE_VARIABLE_INITIAL_VALUES,
  getStageBackground,
  getStageHeight,
  getStageTileSize,
  getStageWidth,
  getStageVariableBooleanInEffect,
  getStageWrapX,
  getStageWrapY,
  isStageVariableValueValid,
} from "./builtin-stage-variables";
import {
  coerceToBoolean,
  coerceToBoundedInteger,
  coerceToCSSBackground,
  coerceToNumber,
  isBooleanValue,
  isBoundedIntegerValue,
  isCSSBackgroundValue,
  isNumericValue,
} from "./variable-coercion";

const stageWith = (values: Record<string, string>): Pick<Stage, "variableValues"> => ({
  variableValues: { ...BUILTIN_STAGE_VARIABLE_INITIAL_VALUES, ...values },
});

describe("variable-coercion", () => {
  describe("isNumericValue", () => {
    it("accepts numbers, including negatives and floats", () => {
      expect(isNumericValue("12")).to.be.true;
      expect(isNumericValue("-3")).to.be.true;
      expect(isNumericValue("2.5")).to.be.true;
    });

    it("rejects blank and non-numeric values rather than treating them as 0", () => {
      expect(isNumericValue("")).to.be.false;
      expect(isNumericValue("   ")).to.be.false;
      expect(isNumericValue("#5b87b0")).to.be.false;
      expect(isNumericValue("NaN")).to.be.false;
      expect(isNumericValue("Infinity")).to.be.false;
      expect(isNumericValue(undefined)).to.be.false;
    });
  });

  describe("coerceToNumber", () => {
    it("returns the number when there is one", () => {
      expect(coerceToNumber("7", 1)).to.equal(7);
    });
    it("falls back otherwise", () => {
      expect(coerceToNumber("seven", 1)).to.equal(1);
      expect(coerceToNumber("", 1)).to.equal(1);
    });
  });

  describe("coerceToBoundedInteger", () => {
    const bounds = { min: 1, max: 100, fallback: 22 };

    it("returns whole numbers inside the range unchanged", () => {
      expect(coerceToBoundedInteger("13", bounds)).to.equal(13);
    });

    it("rounds and clamps numbers it can still make sense of", () => {
      expect(coerceToBoundedInteger("13.4", bounds)).to.equal(13);
      expect(coerceToBoundedInteger("9999", bounds)).to.equal(100);
      expect(coerceToBoundedInteger("-5", bounds)).to.equal(1);
    });

    it("falls back for values that are not numbers at all", () => {
      expect(coerceToBoundedInteger("#5b87b0", bounds)).to.equal(22);
      expect(coerceToBoundedInteger("NaN", bounds)).to.equal(22);
      expect(coerceToBoundedInteger("", bounds)).to.equal(22);
      expect(coerceToBoundedInteger(undefined, bounds)).to.equal(22);
    });
  });

  describe("isBoundedIntegerValue", () => {
    it("rejects values that are usable only after rounding or clamping", () => {
      expect(isBoundedIntegerValue("13", { min: 1, max: 100 })).to.be.true;
      expect(isBoundedIntegerValue("13.4", { min: 1, max: 100 })).to.be.false;
      expect(isBoundedIntegerValue("101", { min: 1, max: 100 })).to.be.false;
      expect(isBoundedIntegerValue("0", { min: 1, max: 100 })).to.be.false;
    });
  });

  describe("coerceToBoolean", () => {
    it("reads the spellings rules and kids produce", () => {
      expect(coerceToBoolean("true", false)).to.be.true;
      expect(coerceToBoolean("TRUE", false)).to.be.true;
      expect(coerceToBoolean("1", false)).to.be.true;
      expect(coerceToBoolean("yes", false)).to.be.true;
      expect(coerceToBoolean("false", true)).to.be.false;
      expect(coerceToBoolean("0", true)).to.be.false;
      expect(coerceToBoolean("", true)).to.be.false;
    });

    it("falls back on anything else", () => {
      expect(coerceToBoolean("#5b87b0", true)).to.be.true;
      expect(coerceToBoolean("#5b87b0", false)).to.be.false;
      expect(isBooleanValue("#5b87b0")).to.be.false;
      expect(isBooleanValue("true")).to.be.true;
    });
  });

  describe("coerceToCSSBackground", () => {
    it("keeps url() expressions and colors", () => {
      expect(coerceToCSSBackground("url('/a.png')", "#fff")).to.equal("url('/a.png')");
      expect(coerceToCSSBackground("#5b87b0", "#fff")).to.equal("#5b87b0");
      expect(isCSSBackgroundValue("#5b87b0")).to.be.true;
    });

    it("falls back on a blank value", () => {
      expect(coerceToCSSBackground("", "#fff")).to.equal("#fff");
      expect(coerceToCSSBackground(undefined, "#fff")).to.equal("#fff");
      expect(isCSSBackgroundValue("")).to.be.false;
    });
  });
});

describe("builtin stage variable readers", () => {
  it("reads good values", () => {
    const stage = stageWith({ width: "20", height: "10", tileSize: "24" });
    expect(getStageWidth(stage)).to.equal(20);
    expect(getStageHeight(stage)).to.equal(10);
    expect(getStageTileSize(stage)).to.equal(24);
  });

  // The bug this guards: a rule that meant to set a color set the stage's
  // height instead, and every read of it threw on the way to the renderer.
  it("falls back instead of throwing when a rule stores nonsense", () => {
    const stage = stageWith({ width: "#5b87b0", height: "NaN", tileSize: "" });
    expect(getStageWidth(stage)).to.equal(22);
    expect(getStageHeight(stage)).to.equal(13);
    expect(getStageTileSize(stage)).to.equal(40);
  });

  it("falls back when a value is missing entirely", () => {
    expect(getStageWidth({ variableValues: {} })).to.equal(22);
    expect(getStageBackground({ variableValues: {} })).to.equal(
      BUILTIN_STAGE_VARIABLE_INITIAL_VALUES.background,
    );
  });

  it("clamps dimensions that would take the browser down", () => {
    expect(getStageWidth(stageWith({ width: "100000000" }))).to.equal(1000);
    expect(getStageHeight(stageWith({ height: "0" }))).to.equal(1);
  });

  it("reads wrap flags without a crash-prone exact-string match", () => {
    expect(getStageWrapX(stageWith({ wrapX: "false" }))).to.be.false;
    expect(getStageWrapY(stageWith({ wrapY: "true" }))).to.be.true;
    expect(getStageWrapX(stageWith({ wrapX: "#5b87b0" }))).to.be.true; // fallback
  });

  it("falls back on a background that isn't a color or an image", () => {
    expect(getStageBackground(stageWith({ background: "#005392" }))).to.equal("#005392");
    expect(getStageBackground(stageWith({ background: "" }))).to.equal(
      BUILTIN_STAGE_VARIABLE_INITIAL_VALUES.background,
    );
  });

  // The inspector renders its wrap checkbox through this, so a mismatch here
  // would show "Off" on a stage that is actually wrapping.
  it("reports the boolean in effect using the engine's own fallback", () => {
    expect(getStageVariableBooleanInEffect(BUILTIN_STAGE_VARIABLES.wrapX, "false")).to.be.false;
    expect(getStageVariableBooleanInEffect(BUILTIN_STAGE_VARIABLES.wrapX, "#5b87b0")).to.equal(
      getStageWrapX(stageWith({ wrapX: "#5b87b0" })),
    );
    expect(getStageVariableBooleanInEffect(BUILTIN_STAGE_VARIABLES.wrapY, "NaN")).to.equal(
      getStageWrapY(stageWith({ wrapY: "NaN" })),
    );
  });

  describe("isStageVariableValueValid", () => {
    const width = BUILTIN_STAGE_VARIABLES.width;
    const wrapX = BUILTIN_STAGE_VARIABLES.wrapX;

    it("reports whether the stored value is the one in effect", () => {
      expect(isStageVariableValueValid(width, "20")).to.be.true;
      expect(isStageVariableValueValid(width, "#5b87b0")).to.be.false;
      expect(isStageVariableValueValid(width, "0")).to.be.false;
      expect(isStageVariableValueValid(wrapX, "true")).to.be.true;
      expect(isStageVariableValueValid(wrapX, "sometimes")).to.be.false;
    });

    it("treats custom stage variables as always valid", () => {
      const custom: StageVariable = { id: "difficulty", name: "Difficulty" };
      expect(isStageVariableValueValid(custom, "spicy")).to.be.true;
    });
  });
});

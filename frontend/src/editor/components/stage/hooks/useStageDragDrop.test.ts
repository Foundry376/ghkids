import { describe, it } from "mocha";
import { expect } from "chai";
import {
  parseSpriteDropData,
  parseAppearanceDropData,
  parseHandleSide,
  calculateNewExtent,
  calculateDropOffset,
  cloneExistsAtPosition,
  ActorDropData,
  CharacterDropData,
} from "./useStageDragDrop";
import { Actor, Characters, RuleExtent } from "../../../../types";

// Mock DataTransfer for testing
function createMockDataTransfer(data: Record<string, string>): DataTransfer {
  const storage: Record<string, string> = { ...data };
  return {
    getData: (key: string) => storage[key] || "",
    setData: (key: string, value: string) => {
      storage[key] = value;
    },
    types: Object.keys(storage),
  } as unknown as DataTransfer;
}

describe("useStageDragDrop", () => {
  describe("parseSpriteDropData", () => {
    it("returns ActorDropData when dragging actors", () => {
      const actorData: ActorDropData = {
        actorIds: ["actor-1", "actor-2"],
        dragAnchorActorId: "actor-1",
      };
      const dataTransfer = createMockDataTransfer({
        sprite: JSON.stringify(actorData),
      });

      const result = parseSpriteDropData(dataTransfer);

      expect(result).to.deep.equal(actorData);
      expect(result && "actorIds" in result).to.be.true;
    });

    it("returns CharacterDropData when dragging a character", () => {
      const characterData: CharacterDropData = {
        characterId: "char-1",
        appearanceId: "appearance-1",
      };
      const dataTransfer = createMockDataTransfer({
        sprite: JSON.stringify(characterData),
      });

      const result = parseSpriteDropData(dataTransfer);

      expect(result).to.deep.equal(characterData);
      expect(result && "characterId" in result).to.be.true;
    });

    it("returns undefined when no sprite data", () => {
      const dataTransfer = createMockDataTransfer({});

      const result = parseSpriteDropData(dataTransfer);

      expect(result).to.be.undefined;
    });

    it("returns undefined when sprite data is invalid JSON", () => {
      const dataTransfer = createMockDataTransfer({
        sprite: "not valid json",
      });

      const result = parseSpriteDropData(dataTransfer);

      expect(result).to.be.undefined;
    });

    it("returns undefined when sprite data has no recognized fields", () => {
      const dataTransfer = createMockDataTransfer({
        sprite: JSON.stringify({ unknownField: "value" }),
      });

      const result = parseSpriteDropData(dataTransfer);

      expect(result).to.be.undefined;
    });
  });

  describe("parseAppearanceDropData", () => {
    it("parses valid appearance data", () => {
      const appearanceData = {
        characterId: "char-1",
        appearance: "happy",
      };
      const dataTransfer = createMockDataTransfer({
        appearance: JSON.stringify(appearanceData),
      });

      const result = parseAppearanceDropData(dataTransfer);

      expect(result).to.deep.equal(appearanceData);
    });

    it("returns undefined when no appearance data", () => {
      const dataTransfer = createMockDataTransfer({});

      const result = parseAppearanceDropData(dataTransfer);

      expect(result).to.be.undefined;
    });

    it("returns undefined when appearance data is invalid JSON", () => {
      const dataTransfer = createMockDataTransfer({
        appearance: "invalid json",
      });

      const result = parseAppearanceDropData(dataTransfer);

      expect(result).to.be.undefined;
    });
  });

  describe("parseHandleSide", () => {
    it("extracts left handle", () => {
      const types = ["handle", "handle:left"];

      const result = parseHandleSide(types);

      expect(result).to.equal("left");
    });

    it("extracts right handle", () => {
      const types = ["handle", "handle:right"];

      const result = parseHandleSide(types);

      expect(result).to.equal("right");
    });

    it("extracts top handle", () => {
      const types = ["handle", "handle:top"];

      const result = parseHandleSide(types);

      expect(result).to.equal("top");
    });

    it("extracts bottom handle", () => {
      const types = ["handle", "handle:bottom"];

      const result = parseHandleSide(types);

      expect(result).to.equal("bottom");
    });

    it("returns undefined when no handle type", () => {
      const types = ["sprite", "other"];

      const result = parseHandleSide(types);

      expect(result).to.be.undefined;
    });

    it("returns undefined for invalid handle side", () => {
      const types = ["handle:invalid"];

      const result = parseHandleSide(types);

      expect(result).to.be.undefined;
    });
  });

  describe("calculateNewExtent", () => {
    const baseExtent: RuleExtent = {
      xmin: 2,
      xmax: 5,
      ymin: 2,
      ymax: 5,
      ignored: [],
    };
    const stageWidth = 10;
    const stageHeight = 10;

    describe("left handle", () => {
      it("moves left edge inward", () => {
        const result = calculateNewExtent(
          baseExtent,
          "left",
          { x: 3.5, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmin).to.equal(4); // round(3.5 + 0.25) = 4
        expect(result.xmax).to.equal(baseExtent.xmax);
      });

      it("cannot move past right edge", () => {
        const result = calculateNewExtent(
          baseExtent,
          "left",
          { x: 7, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmin).to.equal(baseExtent.xmax); // capped at xmax
      });

      it("cannot go below 0", () => {
        const result = calculateNewExtent(
          baseExtent,
          "left",
          { x: -5, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmin).to.equal(0);
      });
    });

    describe("right handle", () => {
      it("moves right edge inward", () => {
        const result = calculateNewExtent(
          baseExtent,
          "right",
          { x: 4.5, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmax).to.equal(4); // round(4.5 - 1) = round(3.5) = 4
        expect(result.xmin).to.equal(baseExtent.xmin);
      });

      it("cannot move past left edge", () => {
        const result = calculateNewExtent(
          baseExtent,
          "right",
          { x: 1, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmax).to.equal(baseExtent.xmin); // capped at xmin
      });

      it("cannot exceed stage width", () => {
        const result = calculateNewExtent(
          baseExtent,
          "right",
          { x: 15, y: 3 },
          stageWidth,
          stageHeight
        );

        expect(result.xmax).to.equal(stageWidth);
      });
    });

    describe("top handle", () => {
      it("moves top edge downward", () => {
        const result = calculateNewExtent(
          baseExtent,
          "top",
          { x: 3, y: 3.5 },
          stageWidth,
          stageHeight
        );

        expect(result.ymin).to.equal(4); // round(3.5 + 0.25) = 4
        expect(result.ymax).to.equal(baseExtent.ymax);
      });

      it("cannot move past bottom edge", () => {
        const result = calculateNewExtent(
          baseExtent,
          "top",
          { x: 3, y: 7 },
          stageWidth,
          stageHeight
        );

        expect(result.ymin).to.equal(baseExtent.ymax);
      });

      it("cannot go below 0", () => {
        const result = calculateNewExtent(
          baseExtent,
          "top",
          { x: 3, y: -5 },
          stageWidth,
          stageHeight
        );

        expect(result.ymin).to.equal(0);
      });
    });

    describe("bottom handle", () => {
      it("moves bottom edge upward", () => {
        const result = calculateNewExtent(
          baseExtent,
          "bottom",
          { x: 3, y: 4.5 },
          stageWidth,
          stageHeight
        );

        expect(result.ymax).to.equal(4); // round(4.5 - 1) = round(3.5) = 4
        expect(result.ymin).to.equal(baseExtent.ymin);
      });

      it("cannot move past top edge", () => {
        const result = calculateNewExtent(
          baseExtent,
          "bottom",
          { x: 3, y: 1 },
          stageWidth,
          stageHeight
        );

        expect(result.ymax).to.equal(baseExtent.ymin);
      });

      it("cannot exceed stage height", () => {
        const result = calculateNewExtent(
          baseExtent,
          "bottom",
          { x: 3, y: 15 },
          stageWidth,
          stageHeight
        );

        expect(result.ymax).to.equal(stageHeight);
      });
    });

    it("preserves ignored array", () => {
      const extentWithIgnored: RuleExtent = {
        ...baseExtent,
        ignored: [{ x: 3, y: 3 }],
      };

      const result = calculateNewExtent(
        extentWithIgnored,
        "left",
        { x: 3, y: 3 },
        stageWidth,
        stageHeight
      );

      expect(result.ignored).to.deep.equal([{ x: 3, y: 3 }]);
    });
  });

  describe("calculateDropOffset", () => {
    it("calculates positive offset when dropping to the right", () => {
      const anchorActor = {
        id: "actor-1",
        position: { x: 2, y: 3 },
      } as Actor;
      const targetPosition = { x: 5, y: 3 };

      const result = calculateDropOffset(anchorActor, targetPosition);

      expect(result.offsetX).to.equal(3);
      expect(result.offsetY).to.equal(0);
    });

    it("calculates negative offset when dropping to the left", () => {
      const anchorActor = {
        id: "actor-1",
        position: { x: 5, y: 5 },
      } as Actor;
      const targetPosition = { x: 2, y: 3 };

      const result = calculateDropOffset(anchorActor, targetPosition);

      expect(result.offsetX).to.equal(-3);
      expect(result.offsetY).to.equal(-2);
    });

    it("returns zero offset when dropping in same position", () => {
      const anchorActor = {
        id: "actor-1",
        position: { x: 3, y: 3 },
      } as Actor;
      const targetPosition = { x: 3, y: 3 };

      const result = calculateDropOffset(anchorActor, targetPosition);

      expect(result.offsetX).to.equal(0);
      expect(result.offsetY).to.equal(0);
    });
  });

  describe("cloneExistsAtPosition", () => {
    const characters: Characters = {
      "char-1": {
        id: "char-1",
        name: "Test Character",
        spritesheet: {
          appearances: {
            default: {
              grid: [[0]],
            },
          },
        },
        rules: [],
      } as unknown as Characters[string],
    };

    const stageActors: { [id: string]: Actor } = {
      "actor-1": {
        id: "actor-1",
        characterId: "char-1",
        appearance: "default",
        position: { x: 3, y: 3 },
      } as Actor,
    };

    it("returns true when identical actor exists at same position", () => {
      const newActorPoints = ["3,3"];

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-1",
        "default",
        stageActors,
        characters
      );

      expect(result).to.be.true;
    });

    it("returns false when no actor at position", () => {
      const newActorPoints = ["5,5"];

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-1",
        "default",
        stageActors,
        characters
      );

      expect(result).to.be.false;
    });

    it("returns false when actor at position has different appearance", () => {
      const newActorPoints = ["3,3"];

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-1",
        "different-appearance",
        stageActors,
        characters
      );

      expect(result).to.be.false;
    });

    it("returns false when actor at position has different character", () => {
      const newActorPoints = ["3,3"];

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-2",
        "default",
        stageActors,
        characters
      );

      expect(result).to.be.false;
    });

    it("returns true when any point overlaps", () => {
      const newActorPoints = ["2,2", "3,3", "4,4"]; // 3,3 overlaps

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-1",
        "default",
        stageActors,
        characters
      );

      expect(result).to.be.true;
    });

    it("returns false with empty stage", () => {
      const newActorPoints = ["3,3"];

      const result = cloneExistsAtPosition(
        newActorPoints,
        "char-1",
        "default",
        {},
        characters
      );

      expect(result).to.be.false;
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { Game } from "../types";
import { WORLDS } from "./constants/constants";
import { applyDataMigrations, applyValueChanges } from "./data-migrations";

describe("data-migrations", () => {
  describe("applyValueChanges", () => {
    it("should convert 'none' to '0'", () => {
      expect(applyValueChanges("none")).to.equal("0");
    });

    it("should remove 'deg' suffix from rotation values", () => {
      expect(applyValueChanges("90deg")).to.equal("90");
      expect(applyValueChanges("180deg")).to.equal("180");
      expect(applyValueChanges("270deg")).to.equal("270");
    });

    it("should convert 'flip-xy' to '180'", () => {
      expect(applyValueChanges("flip-xy")).to.equal("180");
    });

    it("should pass through valid transform values unchanged", () => {
      expect(applyValueChanges("0")).to.equal("0");
      expect(applyValueChanges("90")).to.equal("90");
      expect(applyValueChanges("180")).to.equal("180");
      expect(applyValueChanges("270")).to.equal("270");
      expect(applyValueChanges("flip-x")).to.equal("flip-x");
      expect(applyValueChanges("flip-y")).to.equal("flip-y");
      expect(applyValueChanges("d1")).to.equal("d1");
      expect(applyValueChanges("d2")).to.equal("d2");
    });

    it("should pass through non-transform values unchanged", () => {
      expect(applyValueChanges("hello")).to.equal("hello");
      expect(applyValueChanges(42)).to.equal(42);
      expect(applyValueChanges(null)).to.equal(null);
    });
  });

  describe("applyDataMigrations", () => {
    const makeMinimalGame = (data: Partial<Game["data"]>): Game => ({
      name: "Test Game",
      id: 1,
      userId: 1,
      playCount: 0,
      forkCount: 0,
      forkParent: null,
      user: { id: 1, username: "testuser" },
      thumbnail: "",
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
      data: {
        version: 1,
        characters: {},
        world: {
          id: WORLDS.ROOT,
          stages: {},
          globals: {
            click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
            keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
            selectedStageId: {
              id: "selectedStageId",
              name: "Current Level",
              value: "",
              type: "stage",
            },
            cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
          },
          input: { keys: {}, clicks: {} },
          evaluatedRuleDetails: {},
          stageVariables: {},
          history: [],
          metadata: { name: "Test", id: 1 },
        },
        undoStack: [],
        redoStack: [],
        ...data,
      } as Game["data"],
      published: false,
      description: null,
    });

    describe("transform migrations", () => {
      it("should migrate actor transforms from 'none' to '0'", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                id: "stage1",
                order: 0,
                name: "Stage 1",
                actors: {
                  actor1: {
                    id: "actor1",
                    characterId: "char1",
                    variableValues: {},
                    appearance: "app1",
                    position: { x: 0, y: 0 },
                    transform: "none" as any,
                  },
                },
                background: "#000",
                variableValues: {},
              },
            },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: {
                id: "selectedStageId",
                name: "Current Level",
                value: "",
                type: "stage",
              },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: {
              name: "Test",
              id: 1,
              published: false,
              description: null,
            },
          },
        });

        const migrated = applyDataMigrations(game);
        expect(migrated.data.world.stages["stage1"].actors["actor1"].transform).to.equal("0");
      });

      it("should migrate actor transforms from '90deg' to '90'", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                id: "stage1",
                order: 0,
                name: "Stage 1",
                actors: {
                  actor1: {
                    id: "actor1",
                    characterId: "char1",
                    variableValues: {},
                    appearance: "app1",
                    position: { x: 0, y: 0 },
                    transform: "90deg" as any,
                  },
                },
                background: "#000",
                variableValues: {},
              },
            },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: {
                id: "selectedStageId",
                name: "Current Level",
                value: "",
                type: "stage",
              },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: {
              name: "Test",
              id: 1,
              published: false,
              description: null,
            },
          },
        });

        const migrated = applyDataMigrations(game);
        expect(migrated.data.world.stages["stage1"].actors["actor1"].transform).to.equal("90");
      });
    });

    describe("rule action migrations", () => {
      it("should migrate action.to to action.value", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "rule1",
                  type: "rule",
                  name: "Test Rule",
                  mainActorId: "actor1",
                  conditions: [],
                  actors: {
                    actor1: {
                      id: "actor1",
                      characterId: "char1",
                      variableValues: {},
                      appearance: "app1",
                      position: { x: 0, y: 0 },
                    },
                  },
                  actions: [
                    {
                      type: "appearance",
                      actorId: "actor1",
                      to: "app2", // Old format
                    } as any,
                  ],
                  extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                },
              ],
              spritesheet: {
                appearances: { app1: ["data:..."], app2: ["data:..."] },
                appearanceNames: { app1: "Idle", app2: "Walking" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const rule = migrated.data.characters["char1"].rules[0] as any;
        expect(rule.actions[0].value).to.deep.equal({ constant: "app2" });
        expect(rule.actions[0].to).to.be.undefined;
      });

      it("should convert primitive action.value to RuleValue object", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "rule1",
                  type: "rule",
                  name: "Test Rule",
                  mainActorId: "actor1",
                  conditions: [],
                  actors: {
                    actor1: {
                      id: "actor1",
                      characterId: "char1",
                      variableValues: {},
                      appearance: "app1",
                      position: { x: 0, y: 0 },
                    },
                  },
                  actions: [
                    {
                      type: "appearance",
                      actorId: "actor1",
                      value: "app2", // Old primitive format
                    } as any,
                  ],
                  extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                },
              ],
              spritesheet: {
                appearances: { app1: ["data:..."], app2: ["data:..."] },
                appearanceNames: { app1: "Idle", app2: "Walking" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const rule = migrated.data.characters["char1"].rules[0] as any;
        expect(rule.actions[0].value).to.deep.equal({ constant: "app2" });
      });

      it("should handle transform actions with null value", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "rule1",
                  type: "rule",
                  name: "Test Rule",
                  mainActorId: "actor1",
                  conditions: [],
                  actors: {
                    actor1: {
                      id: "actor1",
                      characterId: "char1",
                      variableValues: {},
                      appearance: "app1",
                      position: { x: 0, y: 0 },
                    },
                  },
                  actions: [
                    {
                      type: "transform",
                      actorId: "actor1",
                      operation: "set",
                      value: null,
                    } as any,
                  ],
                  extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                },
              ],
              spritesheet: {
                appearances: { app1: ["data:..."] },
                appearanceNames: { app1: "Idle" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const rule = migrated.data.characters["char1"].rules[0] as any;
        expect(rule.actions[0].value).to.deep.equal({ constant: "0" });
      });
    });

    describe("condition migrations", () => {
      it("should migrate object-style conditions to array format", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "rule1",
                  type: "rule",
                  name: "Test Rule",
                  mainActorId: "actor1",
                  conditions: {
                    actor1: {
                      appearance: {
                        value: { constant: "app1" },
                      },
                    },
                  } as any,
                  actors: {
                    actor1: {
                      id: "actor1",
                      characterId: "char1",
                      variableValues: {},
                      appearance: "app1",
                      position: { x: 0, y: 0 },
                    },
                  },
                  actions: [],
                  extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                },
              ],
              spritesheet: {
                appearances: { app1: ["data:..."] },
                appearanceNames: { app1: "Idle" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const rule = migrated.data.characters["char1"].rules[0] as any;
        expect(Array.isArray(rule.conditions)).to.be.true;
        expect(rule.conditions.length).to.be.greaterThan(0);
        expect(rule.conditions[0].left).to.exist;
        expect(rule.conditions[0].right).to.exist;
        expect(rule.conditions[0].comparator).to.equal("=");
      });

      it("should ensure conditions array is initialized if missing", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "rule1",
                  type: "rule",
                  name: "Test Rule",
                  mainActorId: "actor1",
                  // conditions missing entirely
                  actors: {
                    actor1: {
                      id: "actor1",
                      characterId: "char1",
                      variableValues: {},
                      appearance: "app1",
                      position: { x: 0, y: 0 },
                    },
                  },
                  actions: [],
                  extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                } as any,
              ],
              spritesheet: {
                appearances: { app1: ["data:..."] },
                appearanceNames: { app1: "Idle" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const rule = migrated.data.characters["char1"].rules[0] as any;
        expect(Array.isArray(rule.conditions)).to.be.true;
      });
    });

    describe("nested rule containers", () => {
      it("should migrate rules inside flow containers", () => {
        const game = makeMinimalGame({
          characters: {
            char1: {
              id: "char1",
              name: "Character",
              rules: [
                {
                  id: "flow1",
                  type: "group-flow",
                  name: "Flow Container",
                  behavior: "first",
                  rules: [
                    {
                      id: "rule1",
                      type: "rule",
                      name: "Nested Rule",
                      mainActorId: "actor1",
                      conditions: [],
                      actors: {
                        actor1: {
                          id: "actor1",
                          characterId: "char1",
                          variableValues: {},
                          appearance: "app1",
                          position: { x: 0, y: 0 },
                        },
                      },
                      actions: [
                        {
                          type: "appearance",
                          actorId: "actor1",
                          to: "app2", // Old format
                        } as any,
                      ],
                      extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
                    },
                  ],
                },
              ],
              spritesheet: {
                appearances: { app1: ["data:..."], app2: ["data:..."] },
                appearanceNames: { app1: "Idle", app2: "Walking" },
              },
              variables: {},
            },
          },
        });

        const migrated = applyDataMigrations(game);
        const flowContainer = migrated.data.characters["char1"].rules[0] as any;
        const nestedRule = flowContainer.rules[0];
        expect(nestedRule.actions[0].value).to.deep.equal({ constant: "app2" });
        expect(nestedRule.actions[0].to).to.be.undefined;
      });
    });

    describe("game structure preservation", () => {
      it("should preserve game metadata", () => {
        const game = makeMinimalGame({});
        const migrated = applyDataMigrations(game);

        expect(migrated.name).to.equal("Test Game");
        expect(migrated.id).to.equal(1);
        expect(migrated.userId).to.equal(1);
        expect(migrated.user.username).to.equal("testuser");
      });

      it("should not mutate original game object", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                id: "stage1",
                order: 0,
                name: "Stage 1",
                actors: {
                  actor1: {
                    id: "actor1",
                    characterId: "char1",
                    variableValues: {},
                    appearance: "app1",
                    position: { x: 0, y: 0 },
                    transform: "none" as any,
                  },
                },
                background: "#000",
                variableValues: {},
              },
            },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: {
                id: "selectedStageId",
                name: "Current Level",
                value: "",
                type: "stage",
              },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: {
              name: "Test",
              id: 1,
              published: false,
              description: null,
            },
          },
        });

        const originalTransform = game.data.world.stages["stage1"].actors["actor1"].transform;
        applyDataMigrations(game);

        // Original should be unchanged
        expect(game.data.world.stages["stage1"].actors["actor1"].transform).to.equal(
          originalTransform,
        );
      });
    });

    describe("stage wrap migrations", () => {
      const makeStageWithLegacyWrap = (overrides: { wrapX?: boolean; wrapY?: boolean }) => ({
        id: "stage1",
        order: 0,
        name: "Stage 1",
        actors: {},
        background: "#000",
        ...overrides,
      });

      it("should backfill built-in wrapX/wrapY definitions on the world", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: { stage1: makeStageWithLegacyWrap({ wrapX: true, wrapY: false }) as any },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: { id: "selectedStageId", name: "Current Level", value: "", type: "stage" },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        expect(migrated.data.world.stageVariables.wrapX).to.deep.include({
          id: "wrapX",
          type: "boolean",
        });
        expect(migrated.data.world.stageVariables.wrapY).to.deep.include({
          id: "wrapY",
          type: "boolean",
        });
      });

      it("should fold legacy stage.wrapX/wrapY into stage.variableValues", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: { stage1: makeStageWithLegacyWrap({ wrapX: true, wrapY: false }) as any },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: { id: "selectedStageId", name: "Current Level", value: "", type: "stage" },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        const stage = migrated.data.world.stages["stage1"];
        expect(stage.variableValues.wrapX).to.equal("true");
        expect(stage.variableValues.wrapY).to.equal("false");
        expect((stage as any).wrapX).to.be.undefined;
        expect((stage as any).wrapY).to.be.undefined;
      });

      it("should also migrate stages on game.unsavedData", () => {
        const game = makeMinimalGame({}) as any;
        game.unsavedData = {
          version: 2,
          characters: {},
          characterZOrder: [],
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                id: "stage1",
                order: 0,
                name: "Stage 1",
                actors: {},
                background: "#000",
                width: 8,
                height: 5,
                wrapX: false,
                wrapY: true,
              },
            },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: { id: "selectedStageId", name: "Current Level", value: "", type: "stage" },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        };

        const migrated = applyDataMigrations(game) as any;
        const stage = migrated.unsavedData.world.stages.stage1;
        expect(stage.variableValues.wrapX).to.equal("false");
        expect(stage.variableValues.wrapY).to.equal("true");
        expect(stage.variableValues.width).to.equal("8");
        expect(stage.variableValues.height).to.equal("5");
        expect(stage.width).to.be.undefined;
        expect(stage.height).to.be.undefined;
        expect(migrated.unsavedData.world.stageVariables.width).to.deep.include({
          id: "width",
          type: "number",
        });
      });
    });

    describe("stage size migrations", () => {
      it("should fold legacy stage.width/stage.height into stage.variableValues", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                id: "stage1",
                order: 0,
                name: "Stage 1",
                actors: {},
                background: "#000",
                width: 17,
                height: 9,
              } as any,
            },
            globals: {
              click: { id: "click", name: "Clicked Actor", value: "", type: "actor" },
              keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" },
              selectedStageId: { id: "selectedStageId", name: "Current Level", value: "", type: "stage" },
              cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" },
            },
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {},
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        const stage = migrated.data.world.stages["stage1"];
        expect(stage.variableValues.width).to.equal("17");
        expect(stage.variableValues.height).to.equal("9");
        expect((stage as any).width).to.be.undefined;
        expect((stage as any).height).to.be.undefined;
        expect(migrated.data.world.stageVariables.width).to.deep.include({
          id: "width",
          type: "number",
        });
        expect(migrated.data.world.stageVariables.height).to.deep.include({
          id: "height",
          type: "number",
        });
      });
    });

    describe("stage variable defaultValue migrations", () => {
      const stageWithoutVarValues = (id: string) => ({
        id,
        order: 0,
        name: id,
        actors: {},
        background: "#000",
      });

      const baseGlobals = {
        click: { id: "click", name: "Clicked Actor", value: "", type: "actor" as const },
        keypress: { id: "keypress", name: "Key Pressed", value: "", type: "key" as const },
        selectedStageId: {
          id: "selectedStageId" as const,
          name: "Current Level" as const,
          value: "",
          type: "stage" as const,
        },
        cameraFollow: { id: "cameraFollow", name: "Camera Follow", value: "", type: "actor" as const },
      };

      it("should seed missing per-stage values from the definition's legacy defaultValue", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: stageWithoutVarValues("stage1") as any,
              stage2: stageWithoutVarValues("stage2") as any,
            },
            globals: baseGlobals,
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {
              difficulty: { id: "difficulty", name: "Difficulty", defaultValue: "7" } as any,
            },
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        expect(migrated.data.world.stages["stage1"].variableValues.difficulty).to.equal("7");
        expect(migrated.data.world.stages["stage2"].variableValues.difficulty).to.equal("7");
      });

      it("should not overwrite an existing per-stage value during seeding", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: {
              stage1: {
                ...stageWithoutVarValues("stage1"),
                variableValues: { difficulty: "easy" },
              } as any,
            },
            globals: baseGlobals,
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {
              difficulty: { id: "difficulty", name: "Difficulty", defaultValue: "7" } as any,
            },
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        expect(migrated.data.world.stages["stage1"].variableValues.difficulty).to.equal("easy");
      });

      it("should strip defaultValue from stage variable definitions", () => {
        const game = makeMinimalGame({
          world: {
            id: WORLDS.ROOT,
            stages: { stage1: stageWithoutVarValues("stage1") as any },
            globals: baseGlobals,
            input: { keys: {}, clicks: {} },
            evaluatedRuleDetails: {},
            stageVariables: {
              difficulty: { id: "difficulty", name: "Difficulty", defaultValue: "7" } as any,
            },
            history: [],
            metadata: { name: "Test", id: 1, published: false, description: null },
          },
        });

        const migrated = applyDataMigrations(game);
        expect((migrated.data.world.stageVariables.difficulty as any).defaultValue).to.be.undefined;
      });
    });
  });
});

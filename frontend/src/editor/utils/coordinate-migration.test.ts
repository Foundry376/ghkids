/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from "chai";
import { migrateCoordinatesV1ToV2, migrateGameCoordinates } from "./coordinate-migration";

describe("coordinate-migration", () => {
  describe("migrateCoordinatesV1ToV2", () => {
    it("flips actor positions on a stage from Y-down to Y-up", () => {
      const v1 = {
        version: 1,
        characters: {},
        world: {
          stages: {
            s1: {
              id: "s1",
              width: 10,
              height: 8,
              actors: {
                a: { id: "a", characterId: "c", position: { x: 3, y: 0 } }, // top row
                b: { id: "b", characterId: "c", position: { x: 5, y: 7 } }, // bottom row
                c: { id: "c", characterId: "c", position: { x: 0, y: 4 } }, // middle
              },
            },
          },
        },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      expect(v2.version).to.equal(2);
      expect(v2.world.stages.s1.actors.a.position).to.deep.equal({ x: 3, y: 7 }); // top → top
      expect(v2.world.stages.s1.actors.b.position).to.deep.equal({ x: 5, y: 0 }); // bottom → bottom
      expect(v2.world.stages.s1.actors.c.position).to.deep.equal({ x: 0, y: 3 }); // middle stays middle
    });

    it("is idempotent: running on a v2 state returns it unchanged", () => {
      const v2 = {
        version: 2,
        characters: {},
        world: { stages: { s1: { id: "s1", height: 5, width: 5, actors: {} } } },
      };
      const result = migrateCoordinatesV1ToV2(v2);
      expect(result).to.equal(v2);
    });

    it("flips Y on rule-extent and re-keys ignored", () => {
      const v1 = {
        version: 1,
        characters: {
          c: {
            id: "c",
            rules: [
              {
                type: "rule",
                id: "r",
                mainActorId: "m",
                actors: { m: { id: "m", position: { x: 0, y: 0 } } },
                actions: [],
                extent: {
                  xmin: -1,
                  xmax: 1,
                  ymin: -1,
                  ymax: 2,
                  ignored: { "0,2": true, "-1,-1": true },
                },
              },
            ],
          },
        },
        world: { stages: {} },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      const ext = v2.characters.c.rules[0].extent;
      expect(ext.xmin).to.equal(-1);
      expect(ext.xmax).to.equal(1);
      // ymin/ymax sign-swap.
      expect(ext.ymin).to.equal(-2);
      expect(ext.ymax).to.equal(1);
      expect(ext.ignored).to.deep.equal({ "0,-2": true, "-1,1": true });
    });

    it("negates relative Y in rule actor positions and move/create actions", () => {
      const v1 = {
        version: 1,
        characters: {
          c: {
            id: "c",
            rules: [
              {
                type: "rule",
                id: "r",
                mainActorId: "m",
                actors: {
                  m: { id: "m", position: { x: 0, y: 0 } },
                  o: { id: "o", position: { x: 1, y: 2 } },
                },
                actions: [
                  { type: "move", actorId: "m", delta: { x: 0, y: -1 } },
                  { type: "move", actorId: "o", offset: { x: 1, y: 1 } },
                  {
                    type: "create",
                    actorId: "n",
                    actor: {},
                    offset: { x: -1, y: 3 },
                  },
                ],
                extent: { xmin: 0, xmax: 0, ymin: 0, ymax: 0, ignored: {} },
              },
            ],
          },
        },
        world: { stages: {} },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      const rule = v2.characters.c.rules[0];
      expect(rule.actors.o.position).to.deep.equal({ x: 1, y: -2 });
      expect(rule.actions[0].delta).to.deep.equal({ x: 0, y: 1 });
      expect(rule.actions[1].offset).to.deep.equal({ x: 1, y: -1 });
      expect(rule.actions[2].offset).to.deep.equal({ x: -1, y: -3 });
    });

    it("recurses into nested group-event and group-flow containers", () => {
      const v1 = {
        version: 1,
        characters: {
          c: {
            id: "c",
            rules: [
              {
                type: "group-event",
                id: "g1",
                event: "idle",
                rules: [
                  {
                    type: "group-flow",
                    id: "g2",
                    behavior: "first",
                    name: "f",
                    rules: [
                      {
                        type: "rule",
                        id: "r",
                        mainActorId: "m",
                        actors: {},
                        actions: [{ type: "move", actorId: "m", delta: { x: 0, y: 4 } }],
                        extent: { xmin: 0, xmax: 0, ymin: -1, ymax: 1, ignored: {} },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        world: { stages: {} },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      const r = v2.characters.c.rules[0].rules[0].rules[0];
      expect(r.actions[0].delta).to.deep.equal({ x: 0, y: -4 });
      expect(r.extent.ymin).to.equal(-1);
      expect(r.extent.ymax).to.equal(1);
    });

    it("converts door destination Y on the destination stage", () => {
      const v1 = {
        version: 1,
        characters: {
          door: { id: "door", kind: "door", rules: [] },
        },
        world: {
          stages: {
            s1: {
              id: "s1",
              height: 10,
              width: 10,
              actors: {
                d: {
                  id: "d",
                  characterId: "door",
                  position: { x: 1, y: 2 },
                  variableValues: {
                    "door-dest-x": "5",
                    "door-dest-y": "1",
                    "door-dest-stage": "s2",
                  },
                },
              },
            },
            s2: { id: "s2", height: 6, width: 6, actors: {} },
          },
        },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      const door = v2.world.stages.s1.actors.d;
      // Source stage flip: y=2 in a height-10 stage → 7.
      expect(door.position).to.deep.equal({ x: 1, y: 7 });
      // Destination Y is converted using the dest stage height (6): 1 → 4.
      expect(door.variableValues["door-dest-y"]).to.equal("4");
      // X is unchanged.
      expect(door.variableValues["door-dest-x"]).to.equal("5");
    });

    it("does not migrate stages without a positive height", () => {
      const v1 = {
        version: 1,
        characters: {},
        world: {
          stages: {
            broken: { id: "broken", height: 0, actors: { a: { position: { x: 0, y: 5 } } } },
          },
        },
      };
      const v2: any = migrateCoordinatesV1ToV2(v1);
      // Position untouched because height is invalid.
      expect(v2.world.stages.broken.actors.a.position).to.deep.equal({ x: 0, y: 5 });
      // Version still bumped (the function only checks the global version gate).
      expect(v2.version).to.equal(2);
    });
  });

  describe("migrateGameCoordinates", () => {
    it("migrates the data and unsavedData blobs", () => {
      const game = {
        id: 1,
        data: {
          version: 1,
          characters: {},
          world: {
            stages: {
              s: { id: "s", height: 4, actors: { a: { position: { x: 0, y: 0 } } } },
            },
          },
        },
        unsavedData: {
          version: 1,
          characters: {},
          world: {
            stages: {
              s: { id: "s", height: 4, actors: { a: { position: { x: 1, y: 3 } } } },
            },
          },
        },
      };
      const result: any = migrateGameCoordinates(game);
      expect(result.data.world.stages.s.actors.a.position).to.deep.equal({ x: 0, y: 3 });
      expect(result.unsavedData.world.stages.s.actors.a.position).to.deep.equal({ x: 1, y: 0 });
    });
  });
});

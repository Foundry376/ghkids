import axios from "axios";
import WorldOperator from "./frontend-editor-utils/world-operator";
import { Actor, EditorState, Game, Rule, RuleTreeItem, World } from "./types";

// Auth header for the API is a base-64 encoded username:password
const CODAKO_AUTH = `Basic ${btoa("bengotowt123:doggums")}`;
const CODAKO_GAME_ID = 53;

async function run() {
  const saved = await readWorld(CODAKO_GAME_ID);
  console.log(`Loaded ${saved.name}`);

  const { characters, characterZOrder, world } = saved.data;

  // Find the stage we're currently on
  const stage = world.stages[world.globals.selectedStageId.value];

  // Find the actor with the main "Hero" character
  const allActors = Object.values(stage.actors);
  const mainCharacter = Object.values(characters).find(
    (c) => c.name === "Hero"
  );
  const mainActor = allActors.find((a) => a.characterId === mainCharacter.id);

  // See what is around the main actor. My guess is that the state of the world
  // (relative to the position of the main actor) might be the input to an ML model.
  printActorSurroundings(mainActor, allActors);

  // Let's advance the state of the simulation, assuming the user is pressing
  // the right arrow key (key code 39). Note: We could do this over and over,
  // passing the `next` value back in to a new WorldOperator in a loop.
  // We only need to save the world back to the API /if/ we want to visualize
  // it on the web to see the end result.
  world.input = {
    keys: { 39: true }, // key code = true will simulate a key press. Get keycodes at https://www.toptal.com/developers/keycode
    clicks: {}, // character-id = true will simulate clicking
  };

  const operator = WorldOperator(world, characters, characterZOrder);
  const next: World = operator.tick();

  console.log("Advanced game state! Here are the rules that ran:");
  printEvaluatedRuleNames(next, characters);

  saved.data.world = next;
  await writeWorld(CODAKO_GAME_ID, saved);

  console.log(
    `Updated ${saved.name}. ` +
      `Visit https://www.codako.org/editor/${CODAKO_GAME_ID} to see the new state.`
  );
}

/**
 * Given an actor at a specific position, this function prints a 3x3 grid of
 * the area around the actor in the scene so you can visualize it. The IDs
 * printed are the IDs of the characters in those positions.
 *
 *
 *          -          |          -         |          -         |
 *          -          |     aamlcui8uxr    |    1483692683990   |
 *          -          |     oou4u6jemi     |    1483692683990   |
 *
 */
function printActorSurroundings(mainActor: Actor, allActors: Actor[]) {
  for (let x = mainActor.position.x - 1; x <= mainActor.position.x + 1; x++) {
    let row = "";
    for (let y = mainActor.position.y - 1; y <= mainActor.position.y + 1; y++) {
      const actorsAtCoord = allActors.filter(
        (a) => a.position.x === x && a.position.y === y
      );
      const description =
        actorsAtCoord
          .map((a) => a.characterId)
          .join(",")
          .slice(0, 20) || "-";

      const strpad = (20.0 - description.length) / 2;

      row +=
        " ".repeat(Math.ceil(strpad)) +
        description +
        " ".repeat(Math.floor(strpad)) +
        "|";
    }
    console.log(row);
  }
}

function printEvaluatedRuleNames(
  next: World,
  characters: EditorState["characters"]
) {
  const stage = next.stages[next.globals.selectedStageId.value];

  for (const [actorId, actorRules] of Object.entries(next.evaluatedRuleIds)) {
    for (const [ruleId, evaluated] of Object.entries(actorRules)) {
      if (!evaluated) {
        continue;
      }
      const character = characters[stage.actors[actorId].characterId];
      const rule = flattenRules(character.rules).find(
        (r: any) => r.id === ruleId
      );
      if (!rule) {
        // entries also exist for the flow containers (eg: green boxes)
        // but we don't need to log those.
        continue;
      }
      console.log(`Actor ${actorId} (${character.name.trim()}): ${rule.name}`);
    }
  }
}

async function readWorld(id: number) {
  const resp = await axios.get(`https://www.codako.org/worlds/${id}`, {
    headers: { Authorization: CODAKO_AUTH },
    responseType: "json",
  });
  return resp.data as Game;
}

async function writeWorld(id: number, data: any) {
  const resp = await axios.put(`https://www.codako.org/worlds/${id}`, data, {
    headers: { Authorization: CODAKO_AUTH },
    responseType: "json",
  });
  return resp.data as Game;
}

function flattenRules(ruleTree: RuleTreeItem[]): Rule[] {
  return ruleTree.flatMap((r: any) =>
    "rules" in r ? flattenRules(r.rules) : r
  );
}

void run();

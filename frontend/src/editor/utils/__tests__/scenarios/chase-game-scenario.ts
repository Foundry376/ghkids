/**
 * Chase game scenario: A player controlled by keyboard moves while an enemy chases.
 *
 * This tests:
 * - Multiple character types with different behaviors
 * - Key press event handling
 * - Idle event for AI behavior
 * - Multi-frame simulation with changing input
 */

import { expect } from "chai";
import { Characters } from "../../../../types";
import {
  makeActor,
  makeCharacter,
  makeEventGroup,
  makeInput,
  makeRule,
  makeStage,
  makeWorld,
  getActorPositions,
  TestScenario,
} from "../test-fixtures";

export function chaseGameScenario(): TestScenario {
  const playerCharId = "char-player";
  const enemyCharId = "char-enemy";
  const playerActorId = "actor-player";
  const enemyActorId = "actor-enemy";

  // Player moves right on right arrow (key code 39)
  const playerRuleActor = makeActor({ id: "player-rule", characterId: playerCharId });
  const movePlayerRule = makeRule({
    id: "player-move",
    mainActorId: "player-rule",
    actors: { "player-rule": playerRuleActor },
    actions: [{ type: "move", actorId: "player-rule", delta: { x: 1, y: 0 } }],
  });
  const playerKeyGroup = makeEventGroup({ id: "player-key", event: "key", rules: [movePlayerRule], code: 39 });
  const playerChar = makeCharacter({ id: playerCharId, name: "Player", rules: [playerKeyGroup] });

  // Enemy always moves right on idle (simple AI chasing)
  const enemyRuleActor = makeActor({ id: "enemy-rule", characterId: enemyCharId });
  const moveEnemyRule = makeRule({
    id: "enemy-move",
    mainActorId: "enemy-rule",
    actors: { "enemy-rule": enemyRuleActor },
    actions: [{ type: "move", actorId: "enemy-rule", delta: { x: 1, y: 0 } }],
  });
  const enemyIdleGroup = makeEventGroup({ id: "enemy-idle", event: "idle", rules: [moveEnemyRule] });
  const enemyChar = makeCharacter({ id: enemyCharId, name: "Enemy", rules: [enemyIdleGroup] });

  const characters: Characters = {
    [playerCharId]: playerChar,
    [enemyCharId]: enemyChar,
  };

  // Player starts at (5, 0), enemy at (0, 0)
  const playerActor = makeActor({ id: playerActorId, characterId: playerCharId, position: { x: 5, y: 0 } });
  const enemyActor = makeActor({ id: enemyActorId, characterId: enemyCharId });
  const stage = makeStage({
    id: "stage-1",
    actors: { [playerActorId]: playerActor, [enemyActorId]: enemyActor },
  });
  const world = makeWorld({ stage });

  // Simulate 3 frames with player pressing right each frame
  const inputPerFrame = [
    makeInput({ keys: [39] }),
    makeInput({ keys: [39] }),
    makeInput({ keys: [39] }),
  ];

  return {
    name: "should simulate a simple chase game",
    characters,
    world,
    frames: 3,
    inputPerFrame,
    assertions: (result) => {
      const positions = getActorPositions(result);
      // Player moved 3 right (5+3=8)
      expect(positions[playerActorId]).to.deep.equal({ x: 8, y: 0 });
      // Enemy moved 3 right (0+3=3)
      expect(positions[enemyActorId]).to.deep.equal({ x: 3, y: 0 });
    },
  };
}

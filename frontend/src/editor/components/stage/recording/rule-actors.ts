import React from "react";
import { Actor, Character } from "../../../../types";

/**
 * The actors a rule can name, in the order they're numbered: its "before"
 * picture - only what's inside its box - in reading order, then anything the
 * rule creates. When a rule has two of the same character, ActorBlock numbers
 * them from this, so the same actor gets the same label while it's being
 * recorded, in the recording's actions, and in the saved rule's description.
 */
export const RuleActorsContext = React.createContext<Actor[] | null>(null);

/**
 * A rule's actors in reading order (top row first, then left to right). That
 * comes out the same for a recording, where positions are on the stage, and a
 * saved rule, where they're relative to the main actor.
 */
export function inLabelOrder(actors: { [actorId: string]: Actor }): Actor[] {
  return Object.values(actors).sort(
    (a, b) =>
      b.position.y - a.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id),
  );
}

/** "Coach", or "Coach 2" when the rule has more than one Coach. */
export function actorLabel(character: Character, actor: Actor, ruleActors: Actor[] | null) {
  if (!ruleActors) {
    return character.name;
  }
  const same = ruleActors.filter((a) => a.characterId === actor.characterId);
  const index = same.findIndex((a) => a.id === actor.id);
  return same.length > 1 && index !== -1 ? `${character.name} ${index + 1}` : character.name;
}

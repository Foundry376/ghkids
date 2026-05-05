import { Actor, ActorTransform, Character, Stage, WorldMinimal } from "../../../../types";
import { useEditorSelector } from "../../../../hooks/redux";
import { toDisplayX, toDisplayY } from "../../../utils/coordinate-display";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { TransformLabels } from "../../inspector/transform-images";
import Sprite from "../../sprites/sprite";

// Disambiguation labels appear next to the inspector, so they need to use the
// same Y-up display convention. Two cases:
//   - `stage` provided: actor.position is absolute on that stage. Show
//     `(toDisplayX, toDisplayY)` — what the inspector shows.
//   - `stage` omitted: actor.position is a relative offset from the rule's
//     main actor (rule.actors). X is unshifted, Y is negated to flip
//     direction (internal Y-down "above" of -1 becomes display Y-up +1).
function disambiguationCoords(actor: Actor, stage: Pick<Stage, "height"> | undefined) {
  if (stage) {
    return { x: toDisplayX(actor.position.x), y: toDisplayY(actor.position.y, stage.height) };
  }
  return { x: actor.position.x, y: -actor.position.y };
}

export const ActorBlock = ({
  character,
  actor,
  disambiguate = false,
  stage,
}: {
  character: Character;
  actor: Actor;
  disambiguate?: boolean;
  stage?: Pick<Stage, "height">;
}) => {
  let label: string = character.name;
  if (disambiguate) {
    const { x, y } = disambiguationCoords(actor, stage);
    label = `${character.name} (${x},${y})`;
  }
  return (
    <code>
      <Sprite
        spritesheet={character.spritesheet}
        appearance={actor.appearance}
        transform={actor.transform}
        fit
      />
      {label}
    </code>
  );
};

export const AppearanceBlock = ({
  character,
  appearanceId,
  transform,
}: {
  character: Character;
  appearanceId: string;
  transform?: ActorTransform;
}) => {
  const name = character.spritesheet.appearanceNames[appearanceId] || "";
  return (
    <code>
      <Sprite
        spritesheet={character.spritesheet}
        appearance={appearanceId}
        transform={transform}
        fit
      />
      {name.trim()}
    </code>
  );
};

export const ActorVariableBlock = ({
  character,
  actor,
  disambiguate,
  variableId,
  stage,
}: {
  character: Character;
  actor: Actor;
  disambiguate?: boolean;
  variableId: string;
  stage?: Pick<Stage, "height">;
}) => {
  const getVariableLabel = () => {
    if (variableId === "transform") return "direction";
    if (variableId === "appearance") return "appearance";
    if (variableId === "x") return "Horizontal";
    if (variableId === "y") return "Vertical";
    return <VariableBlock name={(variableId && character.variables[variableId]?.name) || ""} />;
  };

  return (
    <div>
      <ActorBlock character={character} actor={actor} disambiguate={disambiguate} stage={stage} />
      {getVariableLabel()}
    </div>
  );
};

export const TransformBlock = ({
  character,
  appearanceId,
  transform,
}: {
  character?: Character;
  transform?: ActorTransform;
  appearanceId?: string;
}) => {
  return (
    <code>
      {appearanceId && character && (
        <Sprite
          spritesheet={character.spritesheet}
          appearance={appearanceId}
          transform={transform}
          fit
        />
      )}
      {TransformLabels[transform || "0"]}
    </code>
  );
};

export const VariableBlock = ({ name }: { name: string }) => {
  return <code>{(name || "").trim()}</code>;
};

export const ConnectedActorBlock = ({
  actorId,
  recordingWorld,
}: {
  actorId: string;
  recordingWorld?: WorldMinimal;
}) => {
  const world = useEditorSelector((state) => state.world);
  const characters = useEditorSelector((state) => state.characters);
  const stage = getCurrentStageForWorld(recordingWorld || world);
  const actor = stage?.actors[actorId];
  const character = actor && characters[actor.characterId];
  if (actor && character && stage) {
    return <ActorBlock actor={actor} character={character} disambiguate stage={stage} />;
  }
  return <span>{actorId}</span>;
};

import { useSelector } from "react-redux";
import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  EditorState,
  WorldMinimal,
} from "../../../../types";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { TransformLabels } from "../../inspector/transform-images";
import Sprite from "../../sprites/sprite";

export const ActorBlock = ({
  character,
  actor,
  disambiguate = false,
}: {
  character: Character;
  actor: Actor;
  disambiguate?: boolean;
}) => {
  return (
    <code>
      <Sprite
        spritesheet={character.spritesheet}
        appearance={actor.appearance}
        transform={actor.transform}
        fit
      />
      {disambiguate
        ? `${character.name} (${actor.position.x},${actor.position.y})`
        : character.name}
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
}: {
  character: Character;
  actor: Actor;
  disambiguate?: boolean;
  variableId: string;
}) => {
  return (
    <div>
      <ActorBlock character={character} actor={actor} disambiguate={disambiguate} />
      {variableId === "transform" ? (
        "direction"
      ) : variableId === "appearance" ? (
        "appearance"
      ) : (
        <VariableBlock name={(variableId && character.variables[variableId].name) || ""} />
      )}
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
  const world = useSelector<EditorState, WorldMinimal>((state) => state.world);
  const characters = useSelector<EditorState, Characters>((state) => state.characters);
  const actor = getCurrentStageForWorld(recordingWorld || world)?.actors[actorId];
  const character = actor && characters[actor.characterId];
  if (actor && character) {
    return <ActorBlock actor={actor} character={character} disambiguate />;
  }
  return <span>{actorId}</span>;
};

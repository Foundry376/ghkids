import { Actor, ActorTransform, Character } from "../../../../types";
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
      <Sprite spritesheet={character.spritesheet} appearance={actor.appearance} fit />
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
  transform?: string;
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

export const TransformBlock = ({
  character,
  appearanceId,
  transform,
}: {
  character: Character;
  transform?: ActorTransform;
  appearanceId?: string;
}) => {
  return (
    <code>
      {appearanceId && (
        <Sprite
          spritesheet={character.spritesheet}
          appearance={appearanceId}
          transform={transform}
          fit
        />
      )}
      {TransformLabels[transform || "none"]}
    </code>
  );
};

export const VariableBlock = ({ name }: { name: string }) => {
  return <code>{(name || "").trim()}</code>;
};

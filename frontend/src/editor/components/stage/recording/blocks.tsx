import { Actor, ActorTransform, Character, WorldMinimal } from "../../../../types";
import { useEditorSelector } from "../../../../hooks/redux";
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
  const getVariableLabel = () => {
    if (variableId === "transform") return "direction";
    if (variableId === "appearance") return "appearance";
    if (variableId === "x") return "Horizontal";
    if (variableId === "y") return "Vertical";
    return <VariableBlock name={(variableId && character.variables[variableId]?.name) || ""} />;
  };

  return (
    <div>
      <ActorBlock character={character} actor={actor} disambiguate={disambiguate} />
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

const GLOBAL_ICONS: { [id: string]: string } = {
  click: new URL("../../../img/icon_event_click.png", import.meta.url).href,
  keypress: new URL("../../../img/icon_event_key.png", import.meta.url).href,
  selectedStageId: new URL("../../../img/sidebar_choose_background.png", import.meta.url).href,
};

const EmojiIcon = ({ children }: { children: string }) => (
  <span style={{ fontSize: "20px", lineHeight: "24px", marginRight: 6, verticalAlign: "middle" }}>
    {children}
  </span>
);

export const GlobalBlock = ({ globalId, name }: { globalId: string; name?: string }) => {
  return (
    <code>
      {GLOBAL_ICONS[globalId] ? (
        <img
          style={{ width: 40, height: 40, zoom: 0.6, verticalAlign: "middle", marginRight: 8 }}
          src={GLOBAL_ICONS[globalId]}
        />
      ) : (
        <EmojiIcon>🌐</EmojiIcon>
      )}
      {(name ?? globalId).trim()}
    </code>
  );
};

export const StageVariableBlock = ({
  stageVariableId,
  name,
}: {
  stageVariableId: string;
  name?: string;
}) => {
  return (
    <code>
      <EmojiIcon>📍</EmojiIcon>
      {(name ?? stageVariableId).trim()}
    </code>
  );
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
  const actor = getCurrentStageForWorld(recordingWorld || world)?.actors[actorId];
  const character = actor && characters[actor.characterId];
  if (actor && character) {
    return <ActorBlock actor={actor} character={character} disambiguate />;
  }
  return <span>{actorId}</span>;
};

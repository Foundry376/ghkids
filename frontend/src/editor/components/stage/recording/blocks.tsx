import React, { useState } from "react";
import { useEditorSelector } from "../../../../hooks/redux";
import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  RuleValue,
  WorldMinimal,
} from "../../../../types";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { ruleValueFromDragPayload } from "../../../utils/stage-helpers";
import { TransformLabels } from "../../inspector/transform-images";
import Sprite from "../../sprites/sprite";

/** A rule value that points at a variable rather than holding a literal. */
export type VariableRuleValue = Exclude<RuleValue, { constant: string }>;

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

const GlobalBlock = ({ globalId, name }: { globalId: string; name?: string }) => {
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

const StageVariableBlock = ({
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

const ActorVariableBlock = ({
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
    return <code>{((variableId && character.variables[variableId]?.name) || "").trim()}</code>;
  };

  return (
    <div>
      <ActorBlock character={character} actor={actor} disambiguate={disambiguate} />
      {getVariableLabel()}
    </div>
  );
};

/**
 * Renders a reference to a variable - an actor's variable, a global or a level
 * variable - with the icon that identifies which of the three it is. Passing
 * `onChange` turns it into a drop target so the reference can be swapped for
 * another variable dragged out of the inspector.
 */
export const VariableBlock = ({
  value,
  world,
  actors,
  characters,
  onChange,
}: {
  value: VariableRuleValue;
  world: WorldMinimal;
  actors: { [actorId: string]: Actor };
  characters: Characters;
  onChange?: (value: VariableRuleValue) => void;
}) => {
  const [dropping, setDropping] = useState(false);

  const inner = () => {
    if ("globalId" in value) {
      return <GlobalBlock globalId={value.globalId} name={world.globals[value.globalId]?.name} />;
    }
    if ("stageVariableId" in value) {
      return (
        <StageVariableBlock
          stageVariableId={value.stageVariableId}
          name={world.stageVariables?.[value.stageVariableId]?.name}
        />
      );
    }
    const actor = actors[value.actorId];
    const character = actor && characters[actor.characterId];
    if (!actor || !character) {
      return <span />;
    }
    return (
      <ActorVariableBlock
        character={character}
        actor={actor}
        disambiguate={
          Object.values(actors).filter((a) => a.characterId === character.id).length > 1
        }
        variableId={value.variableId}
      />
    );
  };

  if (!onChange) {
    return inner();
  }

  const onDrop = (e: React.DragEvent) => {
    setDropping(false);
    if (!e.dataTransfer.types.includes("variable")) {
      return;
    }
    const dropped = ruleValueFromDragPayload(e.dataTransfer.getData("variable"));
    if (dropped && !("constant" in dropped)) {
      onChange(dropped);
      e.stopPropagation();
    }
  };

  return (
    <div
      className={`variable-block dropping-${dropping}`}
      title="Drop a variable here to change which variable this action modifies."
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("variable")) {
          setDropping(true);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      {inner()}
    </div>
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

import PropTypes from 'prop-types';
import React from 'react';
import { TransformLabels } from "../../inspector/transform-images";
import Sprite from '../../sprites/sprite';

export class ActorBlock extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    disambiguate: PropTypes.bool,
  };
  render() {
    const { character, actor, disambiguate } = this.props;
    return (
      <code>
        <Sprite
          spritesheet={character.spritesheet}
          appearance={actor.appearance}
        />
        {disambiguate
          ? `${character.name} (${actor.position.x},${actor.position.y})`
          : character.name}
      </code>
    );
  }
}

export class AppearanceBlock extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    appearanceId: PropTypes.string,
    transform: PropTypes.string,
  };
  render() {
    const { character, appearanceId, transform } = this.props;
    const name = character.spritesheet.appearanceNames[appearanceId] || "";
    return (
      <code>
        <Sprite
          spritesheet={character.spritesheet}
          appearance={appearanceId}
          transform={transform}
        />
        {name.trim()}
      </code>
    );
  }
}

export class TransformBlock extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    appearanceId: PropTypes.string,
    transform: PropTypes.string,
  };
  render() {
    const { character, appearanceId, transform } = this.props;
    return (
      <code>
        {appearanceId && (
          <Sprite
            spritesheet={character.spritesheet}
            appearance={appearanceId}
            transform={transform}
          />
        )}
        {TransformLabels[transform || "none"]}
      </code>
    );
  }
}

export class VariableBlock extends React.Component {
  static propTypes = {
    name: PropTypes.string,
  };

  render() {
    const { name } = this.props;
    return <code>{(name || "").trim()}</code>;
  }
}

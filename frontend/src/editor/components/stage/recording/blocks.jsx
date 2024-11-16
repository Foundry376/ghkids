import React, {PropTypes} from 'react';
import Sprite from '../../sprites/sprite';

export class ActorBlock extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
  }
  render() {
    const {character, actor} = this.props;
    return (
      <code>
        <Sprite spritesheet={character.spritesheet} appearance={actor.appearance} />
        {character.name}
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
    const {character, appearanceId, transform} = this.props;
    const name = character.spritesheet.appearanceNames[appearanceId] || "";
    return (
      <code>
        <Sprite spritesheet={character.spritesheet} appearance={appearanceId} transform={transform} />
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
    const {character, appearanceId, transform} = this.props;
    return (
      <code>
        <Sprite spritesheet={character.spritesheet} appearance={appearanceId} transform={transform} />
      </code>
    );
  }
}

export class VariableBlock extends React.Component {
  static propTypes = {
    name: PropTypes.string,
  }

  render() {
    const {name} = this.props;
    return (
      <code>{(name || "").trim()}</code>
    );
  }
}
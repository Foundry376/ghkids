import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";
import { makeId } from "../../utils/utils";

import { makeRequest } from "../../../helpers/api";
import { upsertCharacter } from "../../actions/characters-actions";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS } from "../../constants/constants";
import Sprite from "../sprites/sprite";

class CharacterCard extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    spritesheet: PropTypes.object,
    onAdd: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = { added: false };
  }

  _onAdd = () => {
    this.props.onAdd();
    this.setState({ added: true });
  };

  render() {
    return (
      <div className="character-card">
        <div className="actions">
          <Button size="sm" onClick={this._onAdd}>
            {this.state.added ? "Added!" : "Add"}
          </Button>
        </div>
        <div className="name">{this.props.name}</div>
        <div className="appearances">
          {Object.keys(this.props.spritesheet.appearances).map((key) => (
            <Sprite key={key} spritesheet={this.props.spritesheet} appearance={key} fit />
          ))}
        </div>
      </div>
    );
  }
}

class CharacterBrowser extends React.Component {
  static propTypes = {
    characters: PropTypes.array,
    onAddCharacter: PropTypes.func,
  };

  render() {
    const { onAddCharacter, characters } = this.props;
    return (
      <div className="character-cards">
        {characters.map((character) => (
          <CharacterCard
            key={character.name}
            {...character}
            onAdd={() => onAddCharacter(character)}
          />
        ))}
      </div>
    );
  }
}

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    open: PropTypes.bool,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      characters: null,
    };
  }

  componentDidMount() {
    makeRequest("/characters").then((characters) => {
      this.setState({ characters });
    });
  }

  _onAddCharacter = (character) => {
    const id = makeId("character");
    this.props.dispatch(upsertCharacter(id, Object.assign({}, character, { id })));
  };

  render() {
    return (
      <Modal
        isOpen={this.props.open}
        backdrop="static"
        toggle={() => {}}
        style={{ minWidth: 650, maxWidth: 650 }}
      >
        <div className="modal-header" style={{ display: "flex" }}>
          <h4 style={{ flex: 1 }}>Explore Characters</h4>
        </div>
        {this.state.characters ? (
          <CharacterBrowser
            characters={this.state.characters}
            onAddCharacter={this._onAddCharacter}
          />
        ) : (
          <ModalBody>
            <div>Loading...</div>
          </ModalBody>
        )}
        <ModalFooter>
          <Button onClick={() => this.props.dispatch(dismissModal())}>Done</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  return {
    open: state.ui.modal.openId === MODALS.EXPLORE_CHARACTERS,
  };
}

export default connect(mapStateToProps)(Container);

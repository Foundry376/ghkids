import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Modal from 'reactstrap/lib/Modal';
import ModalBody from 'reactstrap/lib/ModalBody';
import ModalFooter from 'reactstrap/lib/ModalFooter';
import Button from 'reactstrap/lib/Button';


import Sprite from '../sprites/sprite';
import {MODALS} from '../../constants/constants';
import {changeCharacter} from '../../actions/characters-actions';
import {dismissModal} from '../../actions/ui-actions';
import {makeRequest} from '../../../helpers/api';

class CharacterCard extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    spritesheet: PropTypes.object,
    onAdd: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {added: false};
  }

  _onAdd = () => {
    this.props.onAdd();
    this.setState({added: true});
  }

  render() {
    return (
      <div className="character-card">
        <div className="actions">
          <Button size="sm" onClick={this._onAdd}>{this.state.added ? 'Added!' : 'Add'}</Button>
        </div>
        <div className="name">{this.props.name}</div>
        <div className="appearances">
          {
            Object.keys(this.props.spritesheet.appearances).map((key) => 
              <Sprite key={key} spritesheet={this.props.spritesheet} appearance={key} />
            )
          }
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
    const {onAddCharacter, characters} = this.props;
    return (
      <div className="character-cards">
      {
        characters.map((character) => 
          <CharacterCard key={character.name} {...character} onAdd={() => onAddCharacter(character)} />
        )
      }
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
    makeRequest('/characters').then((characters) => {
      this.setState({characters}); 
    });
  }

  _onAddCharacter = (character) => {
    const id = `${Date.now()}`;
    this.props.dispatch(changeCharacter(id, Object.assign({}, character, {id})));
  }

  render() {
    return (
      <Modal isOpen={this.props.open} backdrop="static" toggle={() => {}}>
        <div className="modal-header" style={{display: 'flex'}}>
          <h4 style={{flex: 1}}>Explore Characters</h4>
        </div>
        <ModalBody>
        {
          this.state.characters ? (
            <CharacterBrowser
              characters={this.state.characters}
              onAddCharacter={this._onAddCharacter}
            />
          ) : (
            <div>Loading...</div>
          )
        }
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => this.props.dispatch(dismissModal())}>
            Done
          </Button>
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

export default connect(
  mapStateToProps,
)(Container);

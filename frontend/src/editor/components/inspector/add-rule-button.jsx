import React, {PropTypes} from 'react';

import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';

import {createCharacterEventContainer, createCharacterFlowContainer} from '../../actions/characters-actions';
import {setupRecordingForCharacter, setupRecordingForActor} from '../../actions/recording-actions';
import {pickCharacterRuleEventKey} from '../../actions/ui-actions';

export default class RuleAddButton extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    dispatch: PropTypes.func,
    isRecording: PropTypes.bool,
  };

  constructor(props) {
    super(props);
    this.state = {open: false};
  }

  _onCreateRule = () => {
    const {dispatch, character, actor} = this.props;
    if (actor) {
      dispatch(setupRecordingForActor({characterId: character.id, actor}));
    } else {
      dispatch(setupRecordingForCharacter({characterId: character.id}));
    }
  }

  _onCreateFlowContainer = () => {
    const {dispatch, character} = this.props;
    const id = `${Date.now()}`;
    dispatch(createCharacterFlowContainer(character.id, {id}));
  }

  _onCreateEventContainer = (eventType, eventCode = null) => {
    const {dispatch, character} = this.props;
    const id = `${Date.now()}`;

    dispatch(createCharacterEventContainer(character.id, {id, eventCode, eventType}));
    if (eventType === 'key' && !eventCode) {
      dispatch(pickCharacterRuleEventKey(character.id, id, null));
    }
  }

  render() {
    const {character, isRecording} = this.props;

    return (
      <ButtonDropdown
        isOpen={this.state.open}
        data-tutorial-id="inspector-add-rule"
        toggle={() => this.setState({open: !this.state.open})}
      >
        <DropdownToggle caret disabled={!character || isRecording}>
          <i className="fa fa-tasks" /> Add
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem onClick={this._onCreateRule}>
            <span className="badge rule" /> Add New Rule
          </DropdownItem>
          <DropdownItem divider />
          <DropdownItem onClick={this._onCreateFlowContainer}>
            <span className="badge rule-flow" /> Add Flow Container
          </DropdownItem>
          <DropdownItem divider />
          <DropdownItem data-tutorial-id="inspector-add-rule-key" onClick={() => this._onCreateEventContainer('key')}>
            <span className="badge rule-event" /> When a Key is Pressed...
          </DropdownItem>
          <DropdownItem onClick={() => this._onCreateEventContainer('click')}>
            <span className="badge rule-event" /> When I&#39;m Clicked...
          </DropdownItem>
        </DropdownMenu>
      </ButtonDropdown>
    );
  }
}

import React from 'react'; import PropTypes from 'prop-types';

import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import {createCharacterVariable} from '../../actions/characters-actions';
import {createGlobal} from '../../actions/world-actions';

export default class VariablesAddButton extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    dispatch: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {open: false};
  }

  _onCreateVar = () => {
    this.props.dispatch(createCharacterVariable(this.props.character.id));
  }

  _onCreateGlobal = () => {
    this.props.dispatch(createGlobal());
  }

  render() {
    const {character} = this.props;

    return (
      <ButtonDropdown
        isOpen={this.state.open}
        data-tutorial-id="inspector-add-rule"
        toggle={() => this.setState({open: !this.state.open})}
      >
        <DropdownToggle caret>
          <i className="fa fa-inbox" /> Add
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem disabled={!character} onClick={this._onCreateVar}>
            <span className="badge rule" /> Add Character Variable
          </DropdownItem>
          <DropdownItem divider />
          <DropdownItem onClick={this._onCreateGlobal}>
            <span className="badge rule-flow" /> Add World Variable
          </DropdownItem>
        </DropdownMenu>
      </ButtonDropdown>
    );
  }}

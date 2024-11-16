import React, {PropTypes} from 'react';
import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import DropdownItem from 'reactstrap/lib/DropdownItem';

export default class WorldOptionsMenu extends React.Component {
  static propTypes = {
    onDuplicate: PropTypes.func,
    onDelete: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      open: false,
    };
  }

  render() {
    return (
      <ButtonDropdown
        isOpen={this.state.open}
        toggle={() => this.setState({open: !this.state.open})}
      >
        <DropdownToggle className="btn-link btn-sm">
          <i className="fa fa-ellipsis-v" />
        </DropdownToggle>
        <DropdownMenu right>
          <DropdownItem onClick={this.props.onDuplicate}>
            Duplicate World
          </DropdownItem>
          <DropdownItem divider />
          <DropdownItem onClick={this.props.onDelete}>
            Delete World
          </DropdownItem>
        </DropdownMenu>
      </ButtonDropdown>
    );
  }
}

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';

import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';
import {getStages} from '../../utils/selectors';

class StagePicker extends React.Component {
  static propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.string,
    stages: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      open: false,
    };
  }

  render() {
    const {stages, value, onChange} = this.props;

    return (
      <ButtonDropdown
        size="sm"
        isOpen={this.state.open}
        toggle={() => this.setState({open: !this.state.open})}
      >
        <DropdownToggle caret>
          {stages[value] ? stages[value].name : 'None'}
        </DropdownToggle>
        <DropdownMenu>
        {Object.values(stages).sort((a, b) => a.order - b.order).map(s =>
          <DropdownItem onClick={() => onChange({target: {value: s.id}})} key={s.id}>
            {s.name}
          </DropdownItem>
        )}
        </DropdownMenu>
      </ButtonDropdown>
    );
  }
}

function mapStateToProps(state) {
  return {
    stages: getStages(state),
  };
}

export default connect(
  mapStateToProps,
)(StagePicker);

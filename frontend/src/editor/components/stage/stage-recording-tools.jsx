import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import {TOOL_POINTER, TOOL_IGNORE_SQUARE} from '../../constants/constants';
import classNames from 'classnames';
import {selectToolId} from '../../actions/ui-actions';
import Button from 'reactstrap/lib/Button';

class StageRecordingTools extends React.Component {
  static propTypes = {
    selectedToolId: PropTypes.string.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  render() {
    const {selectedToolId, dispatch} = this.props;
    const selected = selectedToolId === TOOL_IGNORE_SQUARE;

    return (
      <Button
        className={classNames({
          "tool-ignored-square": true,
          "selected": selected,
          "enabled": true,
        })}
        onClick={() => dispatch(selectToolId(selected ? TOOL_POINTER : TOOL_IGNORE_SQUARE))}
      >
        <img src={new URL('../../img/ignored_square.png', import.meta.url).href} />
      </Button>
    );
  }
}

function mapStateToProps(state) {
  return state.ui;
}

export default connect(
  mapStateToProps,
)(StageRecordingTools);

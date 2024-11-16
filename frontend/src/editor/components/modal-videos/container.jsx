import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import Modal from 'reactstrap/lib/Modal';
import ModalBody from 'reactstrap/lib/ModalBody';
import ModalFooter from 'reactstrap/lib/ModalFooter';
import Button from 'reactstrap/lib/Button';

import {dismissModal} from '../../actions/ui-actions';
import {MODALS} from '../../constants/constants';

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    open: PropTypes.bool,
  };

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
  }

  shouldComponentUpdate(nextProps) {
    // Avoid re-rendering the contents of the modal if we aren't visible
    return (this.props.open || nextProps.open);
  }

  componentDidUpdate() {
  }

  _onClose = () => {
    this.props.dispatch(dismissModal());
  }

  render() {
    return (
      <Modal isOpen={this.props.open} backdrop="static" toggle={() => {}}>
        <div className="modal-header" style={{display: 'flex'}}>
          <h4 style={{flex: 1}}>Learning Videos</h4>
        </div>
        <ModalBody>
          <p>Videos are coming soon - stay tuned!</p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this._onClose}>Done</Button>{' '}
        </ModalFooter>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  return {
    open: state.ui.modal.openId === MODALS.VIDEOS,
  };
}

export default connect(
  mapStateToProps,
)(Container);

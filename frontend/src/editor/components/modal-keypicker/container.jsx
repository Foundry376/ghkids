import PropTypes from "prop-types";
import React from "react";
import { connect } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { upsertRecordingCondition } from "../../actions/recording-actions";
import { pickConditionValueFromKeyboard } from "../../actions/ui-actions";
import Keyboard, { keyToCodakoKey } from "./keyboard";

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    open: PropTypes.bool,
    initialKey: PropTypes.string,
    replaceConditionKey: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      key: props.initialKey,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      key: nextProps.initialKey,
    });
  }

  _onClose = () => {
    this.props.dispatch(pickConditionValueFromKeyboard(false, null, null));
  };

  _onCloseAndSave = () => {
    const { dispatch } = this.props;

    if (!this.state.key) {
      return window.alert(
        "Uhoh - press a key on your keyboard or choose one in the picture to continue.",
      );
    }

    dispatch(pickConditionValueFromKeyboard(false, null, null));
    dispatch(
      upsertRecordingCondition({
        key: this.props.replaceConditionKey || `${Math.random()}`,
        enabled: true,
        left: { globalId: "keypress" },
        comparator: "contains",
        right: { constant: this.state.key },
      }),
    );
  };

  _onKeyDown = (event) => {
    this.setState({ key: keyToCodakoKey(event.key) });
    event.preventDefault();
  };

  render() {
    const { open } = this.props;

    return (
      <Modal
        isOpen={open}
        backdrop="static"
        toggle={() => {}}
        style={{ maxWidth: 600, minWidth: 600 }}
      >
        <div className="modal-header" style={{ display: "flex" }}>
          <h4 style={{ flex: 1 }}>Choose Key</h4>
        </div>
        <ModalBody>
          {open && <Keyboard value={this.state.key} onKeyDown={this._onKeyDown} />}
        </ModalBody>
        <ModalFooter>
          <Button onClick={this._onClose}>Cancel</Button>{" "}
          <Button data-tutorial-id="keypicker-done" onClick={this._onCloseAndSave}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  console.log(state.ui.keypicker);
  return Object.assign({}, state.ui.keypicker);
}

export default connect(mapStateToProps)(Container);

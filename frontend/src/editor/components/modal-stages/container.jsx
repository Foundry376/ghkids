import React from 'react'; import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Modal from 'reactstrap/lib/Modal';
import ModalBody from 'reactstrap/lib/ModalBody';
import ModalFooter from 'reactstrap/lib/ModalFooter';
import Button from 'reactstrap/lib/Button';

import StageSettings from './settings';
import {MODALS, WORLDS} from '../../constants/constants';
import {getCurrentStage, getStagesList} from '../../utils/selectors';
import {selectStageId, dismissModal} from '../../actions/ui-actions';
import {createStage, deleteStageId, updateStageSettings} from '../../actions/stage-actions';
import {getStageScreenshot} from '../../utils/stage-helpers';

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    stagesArray: PropTypes.array,
    stage: PropTypes.object,
    open: PropTypes.bool,
  };

  constructor(props, context) {
    super(props, context);
  }

  componentDidMount() {
    this._scrollToSelectedStage();
  }

  shouldComponentUpdate(nextProps) {
    // Avoid re-rendering the contents of the modal if we aren't visible
    return (this.props.open || nextProps.open);
  }

  componentDidUpdate() {
    window.requestAnimationFrame(() => {
      this._scrollToSelectedStage();
    });
  }
  
  _scrollToSelectedStage() {
    if (!this._listEl) {
      return;
    }

    const item = this._listEl.querySelector(`[data-stage-id="${this.props.stage.id}"]`);
    if (item) {
      const [minTop, maxTop] = [this._listEl.scrollTop, this._listEl.scrollTop + this._listEl.clientHeight - item.clientHeight];
      if ((item.offsetTop > maxTop) || (item.offsetTop < minTop)) {
        item.scrollIntoView();
      }
    }
  }

  _onSelectStage = (id) => {
    this.props.dispatch(selectStageId(WORLDS.ROOT, id));
  }

  _onAddStage = () => {
    const name = `Stage ${this.props.stagesArray.length + 1}`;
    this.props.dispatch(createStage(WORLDS.ROOT, name));
  }

  _onRemoveStage = () => {
    const {stagesArray, stage, dispatch} = this.props;

    if (stage && stagesArray.length > 1) {
      const selectedIdx = stagesArray.findIndex(s => s.id === stage.id);
      const nextId = stagesArray[selectedIdx === 0 ? selectedIdx + 1 : selectedIdx - 1].id;

      dispatch(selectStageId(WORLDS.ROOT, nextId));
      dispatch(deleteStageId(WORLDS.ROOT, stage.id));
    }
  }

  _onClose = () => {
    this.props.dispatch(dismissModal());
  }

  render() {
    const {dispatch, stagesArray, stage} = this.props;

    return (
      <Modal isOpen={this.props.open} backdrop="static" toggle={() => {}}>
        <div className="modal-header" style={{display: 'flex'}}>
          <h4 style={{flex: 1}}>Stages</h4>
        </div>
        <div style={{display: 'flex', flexDirection: 'row'}}>
          <div className="stage-sidebar">
            <div
              ref={(el) => this._listEl = el}
              className="stage-list"
            >
              {stagesArray.map((s) => 
                <div
                  key={s.id}
                  data-stage-id={s.id}
                  className={`stage-item ${(stage.id === s.id) && 'selected'}`}
                  onClick={() => this._onSelectStage(s.id)}
                >
                  <img src={getStageScreenshot(s, {size: 320})} />
                  <h3>{s.name || "Untitled"}</h3>  
                </div>
              )}
            </div>
            <div className="bar">
              <Button
                className="add"
                onClick={this._onAddStage}
              >
                <i className="fa fa-plus" />
              </Button>
              <Button
                className="remove"
                disabled={stagesArray.length <= 1}
                onClick={this._onRemoveStage}>
                <i className="fa fa-minus" />
              </Button>
              <div className="space" />
            </div>
          </div>
          <ModalBody>
            <StageSettings
              stage={stage}
              key={stage.id}
              onChange={(settings) => dispatch(updateStageSettings(WORLDS.ROOT, stage.id, settings))}
            />
          </ModalBody>
        </div>
        <ModalFooter>
          <Button color="primary" onClick={this._onClose}>Done</Button>{' '}
        </ModalFooter>
      </Modal>
    );
  }
}

function mapStateToProps(state) {
  return {
    stage: getCurrentStage(state),
    stagesArray: getStagesList(state),
    open: state.ui.modal.openId === MODALS.STAGES,
  };
}

export default connect(
  mapStateToProps,
)(Container);

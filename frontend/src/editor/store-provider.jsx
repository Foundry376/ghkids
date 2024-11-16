/* eslint-disable import/default */

import React, {PropTypes} from 'react';
import {Provider} from 'react-redux';
import u from 'updeep';

import initialData from './reducers/initial-state';
import configureStore from './store/configureStore';
import {getStageScreenshot} from './utils/stage-helpers';
import {getCurrentStage} from './utils/selectors';


export default class StoreProvider extends React.Component {
  static propTypes = {
    world: PropTypes.object,
    children: PropTypes.node,
    onWorldChanged: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);

    this._saveTimeout = null;
    this.state = this.getStateForStore(props.world);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.world.id !== this.props.world.id) {
      this.setState(this.getStateForStore(nextProps.world));
    }
  }

  getStateForStore = (world) => {
    const {data, name, id} = world;

    // perform migrations here as necessary
    const fullState = u({
      world: {
        metadata: {name, id},
      },
    }, data || initialData);

    const store = window.editorStore = configureStore(fullState);
    store.subscribe(this.props.onWorldChanged);

    return {
      editorStore: store,
      loaded: true,
    };
  }

  getWorldSaveData = () => {
    const savedState = u({
      undoStack: u.constant([]),
      redoStack: u.constant([]),
      stages: u.map({history: u.constant([])}),
    }, this.state.editorStore.getState());

    return {
      thumbnail: getStageScreenshot(getCurrentStage(savedState), {size: 400}),
      name: savedState.world.metadata.name,
      data: savedState,
    };
  }

  render() {
    const {editorStore} = this.state;

    return (
      <Provider store={editorStore}>
        {this.props.children}
      </Provider>
    );
  }
}

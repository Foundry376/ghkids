/* eslint-disable import/default */

import PropTypes from "prop-types";
import React from "react";
import { Provider } from "react-redux";
import u from "updeep";

import { default as initialData, default as InitialState } from "./reducers/initial-state";
import configureStore from "./store/configureStore";
import { getCurrentStage } from "./utils/selectors";
import { getStageScreenshot } from "./utils/stage-helpers";

export default class StoreProvider extends React.Component {
  static propTypes = {
    world: PropTypes.object,
    children: PropTypes.node,
    onWorldChanged: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);

    this.state = this.getStateForStore(props.world);
  }

  componentWillReceiveProps(nextProps) {
    // Update if world id changes OR if data changes (for draft loading)
    if (
      nextProps.world.id !== this.props.world.id ||
      JSON.stringify(nextProps.world.data) !== JSON.stringify(this.props.world.data)
    ) {
      this.setState(this.getStateForStore(nextProps.world));
    }
  }

  getStateForStore = (world) => {
    const { data, name, id } = world;

    const fullState = u(
      {
        world: {
          globals: InitialState["world"]["globals"],
          metadata: { name, id },
        },
      },
      data || initialData,
    );

    const store = (window.editorStore = configureStore(fullState));
    store.subscribe(this.props.onWorldChanged);

    return {
      editorStore: store,
      loaded: true,
    };
  };

  getWorldSaveData = () => {
    const savedState = u(
      {
        undoStack: u.constant([]),
        redoStack: u.constant([]),
        stages: u.map({ history: u.constant([]) }),
      },
      this.state.editorStore.getState(),
    );

    return {
      thumbnail: getStageScreenshot(getCurrentStage(savedState), { size: 400 }),
      name: savedState.world.metadata.name,
      data: savedState,
    };
  };

  render() {
    const { editorStore } = this.state;

    return <Provider store={editorStore}>{this.props.children}</Provider>;
  }
}

import React from "react";
import { Provider } from "react-redux";
import { Store } from "redux";
import u from "updeep";

import { EditorState, Game } from "../types";
import { default as initialData, default as InitialState } from "./reducers/initial-state";
import configureStore from "./store/configureStore";
import { getCurrentStage } from "./utils/selectors";
import { getStageScreenshot } from "./utils/stage-helpers";

declare global {
  interface Window {
    editorStore?: Store<EditorState>;
  }
}

interface WorldData {
  id: number;
  name: string;
  data?: Partial<EditorState>;
  published?: boolean;
  description?: string | null;
}

interface StoreProviderProps {
  world: WorldData;
  children: React.ReactNode;
  onWorldChanged: () => void;
}

interface StoreProviderState {
  editorStore: Store<EditorState>;
  loaded: boolean;
}

export interface WorldSaveData {
  thumbnail: string;
  name: string;
  description: string | null;
  published: boolean;
  data: EditorState;
}

export default class StoreProvider extends React.Component<
  StoreProviderProps,
  StoreProviderState
> {
  private _saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: StoreProviderProps) {
    super(props);
    this.state = this.getStateForStore(props.world);
  }

  UNSAFE_componentWillReceiveProps(nextProps: StoreProviderProps) {
    if (nextProps.world.id !== this.props.world.id) {
      this.setState(this.getStateForStore(nextProps.world));
    }
  }

  getStateForStore = (world: WorldData): StoreProviderState => {
    const { data, name, id, published, description } = world;

    const fullState = u(
      {
        world: {
          globals: InitialState["world"]["globals"],
          metadata: { name, id, published: published || false, description: description || null },
        },
      },
      data || initialData
    ) as EditorState;

    const store = (window.editorStore = configureStore(fullState));
    store.subscribe(this.props.onWorldChanged);

    return {
      editorStore: store,
      loaded: true,
    };
  };

  getWorldSaveData = (): WorldSaveData => {
    const savedState = u(
      {
        undoStack: u.constant([]),
        redoStack: u.constant([]),
        stages: u.map({ history: u.constant([]) }),
      },
      this.state.editorStore.getState()
    ) as EditorState;

    const currentStage = getCurrentStage(savedState);

    return {
      thumbnail: currentStage ? getStageScreenshot(currentStage, { size: 400 }) : "",
      name: savedState.world.metadata.name,
      description: savedState.world.metadata.description,
      published: savedState.world.metadata.published,
      data: savedState,
    };
  };

  render() {
    const { editorStore } = this.state;

    return <Provider store={editorStore}>{this.props.children}</Provider>;
  }
}

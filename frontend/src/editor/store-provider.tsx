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

interface StoreProviderProps {
  world: Game;
  children: React.ReactNode;
  onWorldChanged: () => void;
}

interface StoreProviderState {
  editorStore: Store<EditorState>;
  loaded: boolean;
}

export type WorldSaveData = Pick<Game, "thumbnail" | "published"> &
  Partial<Pick<Game, "name" | "description">> & {
    data: EditorState;
  };

export default class StoreProvider extends React.Component<
  StoreProviderProps,
  StoreProviderState
> {
  constructor(props: StoreProviderProps) {
    super(props);
    this.state = this.getStateForStore(props.world);
  }

  /**
   * The title and description as last saved from this editor. A save only
   * sends them when they've changed here since then, so an editor left open
   * doesn't put back an old title or description the author has since edited
   * on the game's play page.
   */
  private savedInfo: Pick<Game, "name" | "description"> = { name: "", description: null };

  UNSAFE_componentWillReceiveProps(nextProps: StoreProviderProps) {
    if (nextProps.world.id !== this.props.world.id) {
      this.setState(this.getStateForStore(nextProps.world));
    }
  }

  getStateForStore = (world: Game): StoreProviderState => {
    const { data, name, id, published, description } = world;
    this.savedInfo = { name, description: description || null };

    const baseState = data || initialData;

    const fullState = u(
      {
        world: {
          globals: InitialState["world"]["globals"],
          metadata: { name, id, published: published || false, description: description || null },
        },
      },
      baseState
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stages: (u as any).map({ history: u.constant([]) }),
        // Drop the transient sub-frame timeline used to animate the last tick.
        // Persisting it makes reopening a saved world replay that tick's
        // animation from frame zero on load.
        world: { evaluatedTickFrames: u.constant([]) },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      this.state.editorStore.getState()
    ) as EditorState;

    const currentStage = getCurrentStage(savedState);

    const { name, description = null } = savedState.world.metadata;
    return {
      thumbnail: currentStage ? (getStageScreenshot(currentStage, { size: 400 }) ?? "") : "",
      ...(name !== this.savedInfo.name ? { name } : {}),
      ...(description !== this.savedInfo.description ? { description } : {}),
      published: savedState.world.metadata.published,
      data: savedState,
    };
  };

  /** Call once a save made from getWorldSaveData() has gone through. */
  markSaved = (json: WorldSaveData) => {
    this.savedInfo = {
      name: json.name ?? this.savedInfo.name,
      description: json.description !== undefined ? json.description : this.savedInfo.description,
    };
  };

  render() {
    const { editorStore } = this.state;

    return <Provider store={editorStore}>{this.props.children}</Provider>;
  }
}

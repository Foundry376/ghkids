/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import { createWorld, User } from "../actions/main-actions";
import RootEditor from "../editor/root-editor";
import StoreProvider from "../editor/store-provider";
import { deepClone } from "../editor/utils/utils";
import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";

import { useParams } from "react-router";
import { applyDataMigrations } from "../editor/data-migrations";
import { useAppSelector } from "../hooks/redux";
import { Game } from "../types";
import PageMessage from "./common/page-message";
import { EditorContext } from "./editor-context";

const APIAdapter = {
  load: function (me: User, worldId: string) {
    return makeRequest<Game>(`/worlds/${worldId}`).then((world) => {
      if (!world || !me || world.userId !== me.id) {
        if (!me) {
          window.location.href = `login?redirectTo=/editor/${worldId}`;
          return Promise.reject(new Error("Redirecting..."));
        }
        return Promise.reject(new Error("Sorry, this world could not be found."));
      }
      return Promise.resolve(world);
    });
  },
  save: function (_me: User, worldId: string, json: any, action?: string) {
    const query = action ? { action } : {};
    return makeRequest(`/worlds/${worldId}`, {
      method: "PUT",
      query,
      json,
    });
  },
};

const LocalStorageAdapter = {
  load: function (_me: User, worldId: string) {
    let _value;
    try {
      _value = JSON.parse(window.localStorage.getItem(worldId)!);
    } catch (err) {
      window.alert(`${err}`);
    }

    if (!_value) {
      window.location.href = `/`;
      return Promise.reject(new Error("This world was not found in your browser's storage."));
    } else if (_value.uploadedAsId) {
      window.location.href = `/editor/${_value.uploadedAsId}`;
      return Promise.reject(new Error("Redirecting to the new path for this world."));
    }
    // Prefer unsavedData if available
    if (_value.unsavedData) {
      _value.data = _value.unsavedData;
    }
    return Promise.resolve(_value);
  },
  save: function (_me: User, worldId: string, json: any, action?: string) {
    const _value = JSON.parse(window.localStorage.getItem(worldId)!);
    if (action === "save") {
      // Copy unsavedData to data, clear unsavedData
      if (_value.unsavedData) {
        _value.data = _value.unsavedData;
        delete _value.unsavedData;
      } else if (json.data) {
        _value.data = json.data;
      }
    } else if (action === "discard") {
      // Clear unsavedData
      delete _value.unsavedData;
    } else {
      // Default: saveDraft - save to unsavedData
      _value.unsavedData = json.data;
      if (json.name) _value.name = json.name;
      if (json.thumbnail) _value.thumbnail = json.thumbnail;
    }
    window.localStorage.setItem(worldId, JSON.stringify(_value));
    return Promise.resolve(_value);
  },
};

// static propTypes = {
//   me: PropTypes.object,
//   dispatch: PropTypes.func,
//   location: PropTypes.shape({
//     query: PropTypes.shape({
//       localstorage: PropTypes.string,
//     }),
//   }),
//   params: PropTypes.shape({
//     worldId: PropTypes.string,
//   }),
// };

const EditorPage = () => {
  const me = useAppSelector((s) => s.me!);
  const dispatch = useDispatch();

  const worldId = useParams().worldId!;

  const _mounted = useRef(true);
  const _savePromise = useRef<Promise<any> | null>(null);
  const storeProvider = useRef<StoreProvider | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [world, setWorld] = useState<Game | null>(null);
  const [retry, setRetry] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const Adapter = window.location.href.includes("localstorage") ? LocalStorageAdapter : APIAdapter;

  useEffect(() => {
    const _onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        const msg = "You have unsaved changes. Are you sure you want to leave?";
        event.returnValue = msg; // Gecko, Trident, Chrome 34+
        return msg; // Gecko, WebKit, Chrome <34
      }
      return undefined;
    };
    window.addEventListener("beforeunload", _onBeforeUnload);
    _mounted.current = true;
    return () => {
      window.removeEventListener("beforeunload", _onBeforeUnload);
      _mounted.current = false;
    };
  }, [hasUnsavedChanges]);

  usePageTitle(world?.name);

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = applyDataMigrations(await Adapter.load(me, worldId));
        // Prefer unsavedData if available, otherwise use data
        if ((loaded as any).unsavedData) {
          loaded.data = (loaded as any).unsavedData;
          setHasUnsavedChanges(true);
        } else {
          setHasUnsavedChanges(false);
        }
        try {
          setWorld(loaded);
          setLoaded(true);
        } catch (err1: any) {
          loaded.data = deepClone(loaded.data);
          delete loaded.data.ui;
          delete loaded.data.recording;
          try {
            setWorld(loaded);
            setLoaded(true);
            setRetry(1);
          } catch {
            setWorld(null);
            setError(err1.toString());
          }
        }
      } catch (err: any) {
        setError(err.message);
        setLoaded(true);
        return;
      }

      if (!_mounted.current) {
        return;
      }
    };
    load();
  }, [me, Adapter, worldId]);

  const saveDraft = () => {
    if (!storeProvider.current) {
      return Promise.resolve();
    }
    const json = storeProvider.current.getWorldSaveData();
    if (_savePromise.current) {
      return _savePromise.current;
    }

    _savePromise.current = Adapter.save(me, worldId, json, "saveDraft")
      .then(() => {
        if (!_mounted.current) {
          return;
        }
        setHasUnsavedChanges(true);
        _savePromise.current = null;
      })
      .catch((e) => {
        if (!_mounted.current) {
          return;
        }
        _savePromise.current = null;
        alert(
          `Codako was unable to save changes to your world. Your internet connection may be offline. \n(Detail: ${e.message})`,
        );
        throw new Error(e);
      });

    return _savePromise.current;
  };

  const save = () => {
    if (!storeProvider.current) {
      return Promise.resolve();
    }
    const json = storeProvider.current.getWorldSaveData();
    if (_savePromise.current) {
      return _savePromise.current;
    }

    _savePromise.current = Adapter.save(me, worldId, json, "save")
      .then(() => {
        if (!_mounted.current) {
          return;
        }
        setHasUnsavedChanges(false);
        _savePromise.current = null;
      })
      .catch((e) => {
        if (!_mounted.current) {
          return;
        }
        _savePromise.current = null;
        alert(
          `Codako was unable to save changes to your world. Your internet connection may be offline. \n(Detail: ${e.message})`,
        );
        throw new Error(e);
      });

    return _savePromise.current;
  };

  const saveAndExit = (dest: string) => {
    save().then(() => {
      if (dest === "tutorial") {
        dispatch(createWorld({ from: "tutorial" }));
      } else {
        window.location.href = dest;
      }
    });
  };

  const exitWithoutSaving = (dest: string) => {
    if (hasUnsavedChanges) {
      Adapter.save(me, worldId, {}, "discard").catch(() => {
        // Ignore errors when discarding
      });
    }
    setHasUnsavedChanges(false);
    if (dest === "tutorial") {
      dispatch(createWorld({ from: "tutorial" }));
    } else {
      window.location.href = dest;
    }
  };

  return (
    <EditorContext.Provider
      value={{
        usingLocalStorage: Adapter === LocalStorageAdapter,
        saveWorldAnd: saveAndExit,
        saveWorld: save,
        save: save,
        saveDraft: saveDraft,
        saveAndExit: saveAndExit,
        exitWithoutSaving: exitWithoutSaving,
        hasUnsavedChanges: hasUnsavedChanges,
      }}
    >
      {error || !loaded ? (
        <PageMessage text={error ? error : "Loading..."} />
      ) : (
        <StoreProvider
          key={`${world!.id}${retry}`}
          world={world}
          onWorldChanged={() => {
            // No auto-save - just mark that there are unsaved changes
            setHasUnsavedChanges(true);
          }}
          ref={(r) => {
            storeProvider.current = r;
          }}
        >
          <RootEditor />
        </StoreProvider>
      )}
    </EditorContext.Provider>
  );
};

export default EditorPage;

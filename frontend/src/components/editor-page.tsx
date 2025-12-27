/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { createWorld, User } from "../actions/main-actions";
import RootEditor from "../editor/root-editor";
import StoreProvider from "../editor/store-provider";
import { deepClone } from "../editor/utils/utils";
import { makeRequest } from "../helpers/api";

import { useParams } from "react-router";
import { applyDataMigrations } from "../editor/data-migrations";
import { MainState } from "../reducers/initial-state";
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
  save: function (_me: User, worldId: string, json: any) {
    return makeRequest(`/worlds/${worldId}`, {
      method: "PUT",
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
    return Promise.resolve(_value);
  },
  save: function (_me: User, worldId: string, json: any) {
    const _value = JSON.parse(window.localStorage.getItem(worldId)!);
    _value.data = json.data;
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
  const me = useSelector<MainState, User>((s) => s.me!);
  const dispatch = useDispatch();

  const worldId = useParams().worldId!;

  const _mounted = useRef(true);
  const _saveTimeout = useRef<number | null>(null);
  const _savePromise = useRef<Promise<any> | null>(null);
  const _pendingSave = useRef(false);
  const storeProvider = useRef<StoreProvider | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [world, setWorld] = useState<Game | null>(null);
  const [retry, setRetry] = useState(0);

  const Adapter = window.location.href.includes("localstorage") ? LocalStorageAdapter : APIAdapter;

  useEffect(() => {
    const _onBeforeUnload = () => {
      if (_saveTimeout.current) {
        saveWorld();

        const msg = "Your changes are still saving. Are you sure you want to close the editor?";
        (event as any).returnValue = msg; // Gecko, Trident, Chrome 34+
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
  });

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = applyDataMigrations(await Adapter.load(me, worldId));
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

  const saveWorld = () => {
    if (!storeProvider.current) {
      // Store provider not initialized yet, mark as pending and skip save
      _pendingSave.current = true;
      return Promise.resolve();
    }
    const json = storeProvider.current.getWorldSaveData();
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
      _saveTimeout.current = null;
    }
    if (_savePromise.current) {
      saveWorldSoon();
      return _savePromise.current;
    }

    _savePromise.current = Adapter.save(me, worldId, json)
      .then(() => {
        if (!_mounted.current) {
          return;
        }
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

  const saveWorldSoon = () => {
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
    }
    _saveTimeout.current = setTimeout(() => {
      saveWorld();
    }, 5000);
  };

  const saveWorldAnd = (dest: string) => {
    saveWorld().then(() => {
      if (dest === "tutorial") {
        dispatch(createWorld({ from: "tutorial" }));
      } else {
        window.location.href = dest;
      }
    });
  };

  return (
    <EditorContext.Provider
      value={{
        usingLocalStorage: Adapter === LocalStorageAdapter,
        saveWorldAnd: saveWorldAnd,
        saveWorld: saveWorld,
      }}
    >
      {error || !loaded ? (
        <PageMessage text={error ? error : "Loading..."} />
      ) : (
        <StoreProvider
          key={`${world!.id}${retry}`}
          world={world}
          onWorldChanged={saveWorldSoon}
          ref={(r) => {
            storeProvider.current = r;
            // If we had a pending save, trigger it now that store is ready
            if (_pendingSave.current && r) {
              _pendingSave.current = false;
              saveWorld();
            }
          }}
        >
          <RootEditor />
        </StoreProvider>
      )}
    </EditorContext.Provider>
  );
};

export default EditorPage;

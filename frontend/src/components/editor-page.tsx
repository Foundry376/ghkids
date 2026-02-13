/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import { createWorld, User } from "../actions/main-actions";
import RootEditor from "../editor/root-editor";
import StoreProvider from "../editor/store-provider";
import { deepClone } from "../editor/utils/utils";
import { makeRequest } from "../helpers/api";
import { useHideRecaptchaBadge } from "../hooks/useHideRecaptchaBadge";
import { usePageTitle } from "../hooks/usePageTitle";

import { useParams } from "react-router";
import { Modal, ModalBody } from "reactstrap";
import Button from "reactstrap/lib/Button";
import { applyDataMigrations } from "../editor/data-migrations";
import { useAppSelector } from "../hooks/redux";
import { Game } from "../types";
import PageMessage from "./common/page-message";
import { EditorContext } from "./editor-context";

function useFullscreenPrompt() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const canFullscreen = !!document.documentElement.requestFullscreen;
    const isAlreadyFullscreen = !!document.fullscreenElement;

    if (isTouchDevice && canFullscreen && !isAlreadyFullscreen) {
      setShowPrompt(true);
    }
  }, []);

  const enter = useCallback(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {
        // Fullscreen request denied — dismiss silently
      });
    }
    setShowPrompt(false);
  }, []);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  return { containerRef, showPrompt, enter, dismiss };
}

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
    // Return unsavedData separately so loading logic can handle it
    // Don't modify _value.data here - let the loading logic decide
    return Promise.resolve(_value);
  },
  save: function (_me: User, worldId: string, json: any, action?: string) {
    const _value = JSON.parse(window.localStorage.getItem(worldId)!);
    if (action === "save") {
      // Copy unsavedData to data, clear unsavedData and its timestamp
      if (_value.unsavedData) {
        _value.data = _value.unsavedData;
        delete _value.unsavedData;
        delete _value.unsavedDataUpdatedAt;
      } else if (json.data) {
        _value.data = json.data;
      }
      if (json.name) _value.name = json.name;
      if (json.thumbnail) _value.thumbnail = json.thumbnail;
      _value.updatedAt = new Date().toISOString();
    } else if (action === "discard") {
      // Clear unsavedData and its timestamp
      delete _value.unsavedData;
      delete _value.unsavedDataUpdatedAt;
    } else {
      // Default: saveDraft - save to unsavedData and update timestamp
      _value.unsavedData = json.data;
      if (json.name) _value.name = json.name;
      if (json.thumbnail) _value.thumbnail = json.thumbnail;
      _value.unsavedDataUpdatedAt = new Date().toISOString();
    }
    window.localStorage.setItem(worldId, JSON.stringify(_value));
    return Promise.resolve(_value);
  },
};

const EditorPage = () => {
  const me = useAppSelector((s) => s.me!);
  const dispatch = useDispatch();

  const worldId = useParams().worldId!;

  const _mounted = useRef(true);
  const _saveTimeout = useRef<number | null>(null);
  const _savePromise = useRef<Promise<any> | null>(null);
  const storeProvider = useRef<StoreProvider | null>(null);
  const _isCommitting = useRef(false); // Flag to prevent auto-save during commit
  const _isExitingWithoutSaving = useRef(false); // Flag to prevent auto-save on exit
  const _isSavingAndExiting = useRef(false); // Flag to prevent warning when saving and exiting

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [world, setWorld] = useState<Game | null>(null);
  const [retry, setRetry] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [draftWorld, setDraftWorld] = useState<Game | null>(null);

  const fullscreen = useFullscreenPrompt();

  const Adapter = window.location.href.includes("localstorage") ? LocalStorageAdapter : APIAdapter;

  useEffect(() => {
    const _onVisibilityChange = () => {
      // Save draft when tab becomes hidden (user switching tabs or closing)
      // But don't save if user explicitly chose to exit without saving
      if (document.hidden && hasUnsavedChanges && storeProvider.current && !_isExitingWithoutSaving.current) {
        // Clear any pending timeout
        if (_saveTimeout.current) {
          clearTimeout(_saveTimeout.current);
          _saveTimeout.current = null;
        }
        // Save draft immediately
        saveDraft();
      }
    };

    const _onBeforeUnload = (event: BeforeUnloadEvent) => {
      // Also try to save on beforeunload as backup, but not if exiting without saving or saving and exiting
      if (
        hasUnsavedChanges &&
        storeProvider.current &&
        !_isExitingWithoutSaving.current &&
        !_isSavingAndExiting.current
      ) {
        if (_saveTimeout.current) {
          clearTimeout(_saveTimeout.current);
          _saveTimeout.current = null;
        }
        saveDraft();
      }
      // Only show warning if we're not explicitly exiting without saving or saving and exiting
      if (
        hasUnsavedChanges &&
        !_isExitingWithoutSaving.current &&
        !_isSavingAndExiting.current
      ) {
        const msg = "You have unsaved changes. Are you sure you want to leave?";
        event.returnValue = msg;
        return msg;
      }
      return undefined;
    };

    document.addEventListener("visibilitychange", _onVisibilityChange);
    window.addEventListener("beforeunload", _onBeforeUnload);
    _mounted.current = true;
    return () => {
      document.removeEventListener("visibilitychange", _onVisibilityChange);
      window.removeEventListener("beforeunload", _onBeforeUnload);
      _mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges]);

  usePageTitle(world?.name);
  useHideRecaptchaBadge();

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = applyDataMigrations(await Adapter.load(me, worldId));
        // Check if there's an unsaved draft
        const unsavedData = (loaded as any).unsavedData;
        const unsavedDataUpdatedAt = (loaded as any).unsavedDataUpdatedAt
          ? new Date((loaded as any).unsavedDataUpdatedAt)
          : null;
        const updatedAt = (loaded as any).updatedAt ? new Date((loaded as any).updatedAt) : null;

        // Check if draft is newer than saved data, or if saved data doesn't exist
        const hasNewerDraft =
          unsavedData &&
          (!updatedAt || !unsavedDataUpdatedAt || unsavedDataUpdatedAt > updatedAt);

        if (hasNewerDraft) {
          // Store both versions for user to choose
          // Draft version uses unsavedData (already parsed JSON from backend)
          const draftVersion: Game = {
            ...loaded,
            data: unsavedData,
          };
          setDraftWorld(draftVersion);
          // Saved version uses the committed data (or draft if no saved data exists)
          const savedVersion: Game = {
            ...loaded,
            data: loaded.data || unsavedData, // Fallback to unsavedData if no saved data exists
          };
          // Set saved version initially (user will choose draft if they want it)
          setWorld(savedVersion);
          setShowDraftPrompt(true);
          // Don't set hasUnsavedChanges yet - wait for user to choose
        } else {
          // No draft or draft is older - load normally
          if (unsavedData && !loaded.data) {
            // If we have unsavedData but no saved data, use unsavedData
            loaded.data = unsavedData;
            setHasUnsavedChanges(true);
          } else if (unsavedData) {
            // If we have both, use saved data (draft is older)
            setHasUnsavedChanges(false);
          } else {
            // No draft at all
            setHasUnsavedChanges(false);
          }
          setWorld(loaded);
        }
        setLoaded(true);
      } catch (err1: any) {
        try {
          const loaded = applyDataMigrations(await Adapter.load(me, worldId));
          loaded.data = deepClone(loaded.data);
          delete loaded.data.ui;
          delete loaded.data.recording;
          setWorld(loaded);
          setLoaded(true);
          setRetry(1);
        } catch {
          setWorld(null);
          setError(err1.toString());
          setLoaded(true);
        }
      }

      if (!_mounted.current) {
        return;
      }
    };
    load();
  }, [me, Adapter, worldId]);

  const saveDraft = () => {
    if (!storeProvider.current || _isCommitting.current || _isExitingWithoutSaving.current) {
      return Promise.resolve();
    }
    const json = storeProvider.current.getWorldSaveData();
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
      _saveTimeout.current = null;
    }
    if (_savePromise.current) {
      saveDraftSoon();
      return _savePromise.current;
    }

    _savePromise.current = Adapter.save(me, worldId, json, "saveDraft")
      .then(() => {
        if (!_mounted.current) {
          return;
        }
        // Don't change hasUnsavedChanges here - it tracks in-memory changes vs draft
        // The draft is now saved, but if there are new changes, hasUnsavedChanges should stay true
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

  const saveDraftSoon = () => {
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
    }
    _saveTimeout.current = setTimeout(() => {
      saveDraft();
    }, 5000);
  };

  const save = () => {
    if (!storeProvider.current) {
      return Promise.resolve();
    }
    const json = storeProvider.current.getWorldSaveData();
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
      _saveTimeout.current = null;
    }
    if (_savePromise.current) {
      // Wait for in-flight save (e.g. draft) to complete, then perform the full save
      return _savePromise.current.then(() => save());
    }

    _isCommitting.current = true; // Prevent auto-save during commit
    _savePromise.current = Adapter.save(me, worldId, json, "save")
      .then(() => {
        if (!_mounted.current) {
          return;
        }
        // After commit, clear unsaved changes flag since everything is now saved
        setHasUnsavedChanges(false);
        _savePromise.current = null;
        // Keep the flag for a short time to prevent immediate re-triggering
        setTimeout(() => {
          _isCommitting.current = false;
        }, 1000);
      })
      .catch((e) => {
        if (!_mounted.current) {
          return;
        }
        _savePromise.current = null;
        _isCommitting.current = false;
        alert(
          `Codako was unable to save changes to your world. Your internet connection may be offline. \n(Detail: ${e.message})`,
        );
        throw new Error(e);
      });

    return _savePromise.current;
  };

  const saveAndExit = (dest: string) => {
    // Set flag to prevent warning
    _isSavingAndExiting.current = true;
    // Clear any pending saves
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
      _saveTimeout.current = null;
    }
    // Clear unsaved changes flag immediately since we're committing
    setHasUnsavedChanges(false);
    save().then(() => {
      // Navigate after save completes
      if (dest === "tutorial") {
        dispatch(createWorld({ from: "tutorial" }));
      } else {
        window.location.href = dest;
      }
    });
  };

  const exitWithoutSaving = (dest: string) => {
    // Set flag to prevent auto-save on exit
    _isExitingWithoutSaving.current = true;
    // Clear any pending saves
    if (_saveTimeout.current) {
      clearTimeout(_saveTimeout.current);
      _saveTimeout.current = null;
    }
    // Discard the draft since user explicitly chose to exit without saving
    if (hasUnsavedChanges) {
      Adapter.save(me, worldId, {}, "discard").catch(() => {
        // Ignore errors when discarding
      });
    }
    setHasUnsavedChanges(false);
    // Navigate after a brief delay to ensure flag is set
    setTimeout(() => {
      if (dest === "tutorial") {
        dispatch(createWorld({ from: "tutorial" }));
      } else {
        window.location.href = dest;
      }
    }, 0);
  };

  const loadDraft = () => {
    if (draftWorld) {
      // Force StoreProvider to re-render by incrementing retry
      setRetry((prev) => prev + 1);
      setWorld(draftWorld);
      setShowDraftPrompt(false);
      setHasUnsavedChanges(true);
    }
  };

  const revertToSaved = () => {
    // Clear unsavedData and load from data
    Adapter.save(me, worldId, {}, "discard").catch(() => {
      // Ignore errors when discarding
    });
    // Force StoreProvider to re-render by incrementing retry
    // world is already set to the saved version
    setRetry((prev) => prev + 1);
    setShowDraftPrompt(false);
    setHasUnsavedChanges(false);
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
      <div ref={fullscreen.containerRef} className="editor-fullscreen-container">
        {error || !loaded ? (
          <PageMessage text={error ? error : "Loading..."} />
        ) : (
          <>
            <Modal isOpen={showDraftPrompt} backdrop="static" centered>
              <div className="modal-header">
                <h4 style={{ marginBottom: 0 }}>Unsaved Draft Found</h4>
              </div>
              <ModalBody>
                <p>
                  We found an unsaved draft from your last session. Would you like to continue
                  working on the draft or revert to the last saved version?
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <Button color="secondary" onClick={revertToSaved}>
                    Revert to Saved
                  </Button>
                  <Button color="primary" onClick={loadDraft}>
                    Load Draft
                  </Button>
                </div>
              </ModalBody>
            </Modal>
            {world && (
              <StoreProvider
                key={`${world.id}${retry}`}
                world={world}
                onWorldChanged={() => {
                  // Auto-save to unsavedData after 5 seconds, but not if we're committing
                  if (!_isCommitting.current) {
                    setHasUnsavedChanges(true);
                    saveDraftSoon();
                  }
                }}
                ref={(r) => {
                  storeProvider.current = r;
                }}
              >
                <RootEditor />
              </StoreProvider>
            )}
          </>
        )}

        {fullscreen.showPrompt && (
          <div className="editor-fullscreen-overlay">
            <div className="editor-fullscreen-overlay__backdrop" onClick={fullscreen.dismiss} />
            <div className="editor-fullscreen-overlay__content">
              <div className="editor-fullscreen-overlay__icon">
                <i className="fa fa-expand" />
              </div>
              <h2>Use Fullscreen Mode</h2>
              <p>
                For the best editing experience on your device, we recommend using fullscreen mode to
                maximize your workspace.
              </p>
              <button className="editor-fullscreen-overlay__btn" onClick={fullscreen.enter}>
                Enter Fullscreen
              </button>
              <button className="editor-fullscreen-overlay__dismiss" onClick={fullscreen.dismiss}>
                Continue without fullscreen
              </button>
            </div>
          </div>
        )}
      </div>
    </EditorContext.Provider>
  );
};

export default EditorPage;

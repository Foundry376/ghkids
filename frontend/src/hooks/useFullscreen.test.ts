import { expect } from "chai";

import { createKeyboardFullscreenRestorer } from "./useFullscreen";

/** Fake fullscreen API where requests succeed only while `gestureAllowed` is set. */
function setup() {
  const state = { fullscreen: false, gestureAllowed: true, requests: 0 };
  const restorer = createKeyboardFullscreenRestorer({
    isFullscreen: () => state.fullscreen,
    requestFullscreen: () => {
      state.requests++;
      if (!state.gestureAllowed) return Promise.reject(new Error("not a gesture"));
      state.fullscreen = true;
      restorer.fullscreenChange();
      return Promise.resolve();
    },
  });
  /** What iPadOS does when the keyboard comes up. */
  const keyboardExitsFullscreen = () => {
    state.fullscreen = false;
    restorer.fullscreenChange();
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  return { state, restorer, keyboardExitsFullscreen, flush };
}

describe("createKeyboardFullscreenRestorer", () => {
  it("re-enters fullscreen when editing ends inside a gesture", () => {
    const { state, restorer, keyboardExitsFullscreen } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    restorer.focusOut(false);
    expect(state.fullscreen).to.equal(true);
    expect(state.requests).to.equal(1);
  });

  it("waits for the next gesture when the blur wasn't one", async () => {
    const { state, restorer, keyboardExitsFullscreen, flush } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    state.gestureAllowed = false;
    restorer.focusOut(false);
    await flush();
    expect(state.fullscreen).to.equal(false);
    expect(restorer.armed).to.equal(true);

    state.gestureAllowed = true;
    restorer.gesture(false);
    expect(state.fullscreen).to.equal(true);
    expect(restorer.armed).to.equal(false);
  });

  it("gives up after a few refused gestures", async () => {
    const { state, restorer, keyboardExitsFullscreen, flush } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    state.gestureAllowed = false;
    restorer.focusOut(false);
    for (let i = 0; i < 5; i++) {
      await flush();
      restorer.gesture(false);
    }
    await flush();
    expect(state.requests).to.equal(4);
    expect(restorer.armed).to.equal(false);
  });

  it("never enters fullscreen when editing started outside it", () => {
    const { state, restorer } = setup();
    restorer.focusIn();
    restorer.focusOut(false);
    restorer.gesture(false);
    expect(state.requests).to.equal(0);
  });

  it("stays out after the user leaves fullscreen on purpose", () => {
    const { state, restorer, keyboardExitsFullscreen } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    restorer.leftFullscreenOnPurpose();
    keyboardExitsFullscreen();
    restorer.focusOut(false);
    restorer.gesture(false);
    expect(state.requests).to.equal(0);
  });

  it("cancels a pending restore on Escape or our own exit", async () => {
    const { state, restorer, keyboardExitsFullscreen, flush } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    state.gestureAllowed = false;
    restorer.focusOut(false);
    await flush();
    restorer.leftFullscreenOnPurpose();
    state.gestureAllowed = true;
    restorer.gesture(false);
    expect(state.requests).to.equal(1);
    expect(state.fullscreen).to.equal(false);
  });

  it("waits while focus moves between text fields", () => {
    const { state, restorer, keyboardExitsFullscreen } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    restorer.focusOut(true);
    restorer.focusIn();
    expect(state.requests).to.equal(0);
    restorer.focusOut(false);
    expect(state.fullscreen).to.equal(true);
  });

  it("carries a pending restore over to the next text field", async () => {
    const { state, restorer, keyboardExitsFullscreen, flush } = setup();
    state.fullscreen = true;
    restorer.focusIn();
    keyboardExitsFullscreen();
    state.gestureAllowed = false;
    restorer.focusOut(false);
    await flush();
    state.gestureAllowed = true;
    // Tapping another field doesn't restore (the keyboard would end it again)...
    restorer.gesture(true);
    restorer.focusIn();
    expect(state.requests).to.equal(1);
    // ...but finishing that edit does.
    restorer.focusOut(false);
    expect(state.fullscreen).to.equal(true);
  });
});

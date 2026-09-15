/**
 * This file has side-effects.
 * It exposes `window.frameworkIconPlay`
 */

export type RewindAnimation = () => void;
export type PlayAnimation = () => Promise<RewindAnimation>;

declare global {
  interface Window {
    frameworkIconPlay: PlayAnimation;
  }
}

function sleep(ms = 0): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

// `elm` is whatever `document.querySelector` returned, null included. The
// accelerometer demo's page has no `.framework-icon`, so `play()` throws there
// the first time a remote calls it - preserved rather than guarded, because
// swallowing it would hide a missing icon on the pages that do have one.
function makeAnimate(elm: Element | null, duration = 1500): PlayAnimation {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  return async function play() {
    function rewind() {
      clearTimeout(timerId);
      elm!.classList.remove("animate");
    }
    // begin by rewinding the transition (whether it's started or not)
    if (elm!.classList.contains("animate")) {
      rewind();
      await sleep(1000);
    }
    // start the transition
    elm!.classList.add("animate");
    // rewind the transition after `duration` (rewindable meanwhile)
    timerId = setTimeout(() => {
      rewind();
    }, duration);
    return rewind;
  };
}

function init() {
  window.frameworkIconPlay = makeAnimate(
    document.querySelector(".framework-icon"),
  );
}

init();

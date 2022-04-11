/**
 * This file has side-effects.
 * It exposes `window.frameworkIconPlay`
 */

function sleep(ms = 0) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

function makeAnimate(elm, duration = 1500) {
  let timerId = null;
  return async function play() {
    function rewind() {
      clearTimeout(timerId);
      elm.classList.remove("animate");
    }
    // begin by rewinding the transition (whether it's started or not)
    if (elm.classList.contains("animate")) {
      rewind();
      await sleep(1000);
    }
    // start the transition
    elm.classList.add("animate");
    // rewind the transition after `duration` (rewindable meanwhile)
    timerId = setTimeout(() => {
      rewind();
    }, duration);
    return rewind;
  };
}

// eslint-disable-next-line no-unused-vars
function init() {
  window.frameworkIconPlay = makeAnimate(
    document.querySelector(".framework-icon")
  );
}

init();

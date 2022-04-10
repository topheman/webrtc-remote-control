function makeAnimate(elm) {
  return function start() {
    function stop() {
      clearTimeout(timerId);
      elm.classList.remove("animate");
    }

    let timerId = null;
    elm.classList.add("animate");
    timerId = setTimeout(() => {
      stop();
    }, 1500);
    return stop;
  };
}

// eslint-disable-next-line no-unused-vars
function init() {
  const start = makeAnimate(document.querySelector(".framework-icon"));

  const refStop = { current: () => {} };

  window.addEventListener("click", () => {
    refStop.current();
  });

  const loop = () => {
    const stop = start();
    refStop.current = stop;
    setTimeout(loop, 3000);
  };

  loop();
}

// init();

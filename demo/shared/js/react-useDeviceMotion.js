// inspired by https://trekhleb.dev/blog/2021/gyro-web/
import { useCallback, useEffect, useState, useRef } from "react";
import lodashThrottle from "lodash/throttle";

export const useDeviceMotion = ({ throttle = 0 } = {}) => {
  const [error, setError] = useState(null);
  const [motion, setMotion] = useState(null);
  const [permissionState, setPermissionState] = useState(null);

  const onDeviceMotion = lodashThrottle((event) => {
    setMotion({
      acceleration: event.acceleration,
      accelerationIncludingGravity: event.accelerationIncludingGravity,
      rotationRate: event.rotationRate,
      interval: event.interval,
      timeStamp: event.timeStamp,
    });
  }, throttle);

  const revokeAccessAsync = async () => {
    window.removeEventListener("devicemotion", onDeviceMotion);
    setMotion(null);
  };

  const requestAccessAsync = async () => {
    if (typeof DeviceMotionEvent === "undefined") {
      setError(
        new Error("Device motion event is not supported by your browser")
      );
      return false;
    }

    if (
      DeviceMotionEvent.requestPermission &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      let permission;
      try {
        permission = await DeviceMotionEvent.requestPermission();
        setPermissionState(permission);
      } catch (err) {
        setError(err);
        return false;
      }
      if (permission !== "granted") {
        setError(new Error("Request to access the device motion was rejected"));
        return false;
      }
    }

    window.addEventListener("devicemotion", onDeviceMotion);

    return true;
  };

  const requestAccess = useCallback(requestAccessAsync, []);
  const revokeAccess = useCallback(revokeAccessAsync, []);

  useEffect(() => {
    return () => {
      revokeAccess();
    };
  }, [revokeAccess]);

  return {
    motion,
    error,
    permissionState, // null/denied/granted
    requestAccess,
    revokeAccess,
  };
};

async function defaultOnRecordStop(payload, { recordEndpoint }, dispatch) {
  try {
    let result = await fetch(recordEndpoint, {
      method: "POST",
      body: JSON.stringify({
        data: payload,
      }),
    });
    result = await result.json();
    if (!result.ok) {
      throw new Error(result.error);
    }
    dispatch("record.saved", null);
  } catch (e) {
    dispatch("record.saved.error", e.message);
    throw new Error(e.message);
  }
}

function makeEventHandler(cb, { recordEndpoint } = {}) {
  const defaultDispatcher = async (event, payload) => {
    switch (event) {
      case "record.stop": {
        defaultOnRecordStop(payload, { recordEndpoint }, dispatch);
        break;
      }
      case "replay.idle": {
        // TODO
        console.log("replay.idle");
        break;
      }
      default:
      // do nothing
    }
  };
  // eslint-disable-next-line no-underscore-dangle
  const _dispatch = cb({ defaultDispatcher }); // (event, payload, dispatch) => void
  const dispatch = (event, payload) => _dispatch(event, payload, _dispatch);
  return dispatch;
}

/**
 * This is a higer order function that adds highly customisable record/replay
 * capabilities to the useDeviceMotion hook
 *
 * @param {typeof useDeviceMotion} hook useDeviceMotion to be decorated
 * @param {{mode: "RECORD" | "REPLAY", duration?: number, prepareDispatch?: ({onRecordStop?: ((payload: any, dispatch: Function)}) => void) => (event: string, payload: any, dispatch: Function) => void}} [options={}]
 * @returns
 *
 * Example of overrides:
 *
```js
decorate(useDeviceMotion, {
  mode: "RECORD",
  duration: 5000,
  prepareDispatch: ({defaultDispatcher}) => (event, payload, dispatch) => {
    if (event === "record.stop") {
      // do something
    }
    else if (event === "record.saved") {
      console.log("saved!")
      setTimeout(() => {
        dispatch("record.saved.1000", null)
      }, 1000)
    }
    else if (event === "record.saved.1000") {
      console.log("1000 ms after saved")
    }
    return defaultDispatcher(event, payload); // comment that if you don't want default actions
  }
})
```
 */
export const decorate = (
  hook,
  {
    mode,
    duration = 4000,
    prepareDispatch = ({ defaultDispatcher }) =>
      (event, payload) => {
        defaultDispatcher(event, payload);
      },
    recordEndpoint = "/dev-api/device-motion-mock",
    replayEndpoint = "/device-motion-events.json",
  } = {}
) => {
  if (!mode) {
    return hook;
  }
  // eslint-disable-next-line no-unused-vars
  const dispatch = makeEventHandler(prepareDispatch, { recordEndpoint });
  if (mode === "RECORD") {
    return (...args) => {
      const ref = useRef([]);
      const [recordIsFinished, setRecordIsFinished] = useState(false);
      const { motion, permissionState, ...rest } = useDeviceMotion(...args);
      console.log("ref.current", ref.current.length);
      if (permissionState === "granted" && motion) {
        if (!recordIsFinished) {
          ref.current.push(motion);
        }
        if (ref.current && ref.current[0]) {
          const first = ref.current[0];
          const [last] = ref.current.slice(-1);
          const computedDuration = last.timeStamp - first.timeStamp;
          if (recordIsFinished === false && computedDuration > duration) {
            setRecordIsFinished(true);
          }
        }
      }
      useEffect(() => {
        if (recordIsFinished) {
          // TODO use dispatch
          console.log("useEffect record is finished", ref.current.length);
          dispatch("record.stop", ref.current);
        } else {
          console.log("useEffect !record is finished", ref.current.length);
        }
      }, [recordIsFinished]);
      return {
        motion,
        ...rest,
      };
    };
  }
  if (mode === "REPLAY") {
    return () => {
      const [playing, setPlaying] = useState(true);
      const [mocks, setMocks] = useState(null);
      const [currentMockIndex, setCurrentMockIndex] = useState(0);
      const [permissionState, setPermissionState] = useState(null);
      const requestAccess = async () => {
        setPermissionState("granted");
      };
      const [error, setError] = useState(null);
      // load mocks when the hook is ready to make network calls
      useEffect(() => {
        window.togglePlay = () => setPlaying((isPlaying) => !isPlaying);
        console.log("Use `togglePlay()` to play/pause the deviceMotionEvents");
        fetch(replayEndpoint)
          .then(async (result) => {
            const loadedMocks = await result.json();
            setMocks(loadedMocks);
            dispatch("replay.mocksLoaded", loadedMocks);
            setTimeout(() => {
              requestAccess();
            }, 200);
          })
          .catch((e) => {
            setError(e.message);
            dispatch("replay.mocksLoaded.error", e.message);
          });
      }, []);
      // update mocks
      useEffect(() => {
        if (permissionState === "granted" && mocks !== null && playing) {
          setTimeout(() => {
            let nextMockIndex;
            if (currentMockIndex >= mocks.length - 1) {
              nextMockIndex = 0;
              dispatch("replay.loop");
            } else {
              nextMockIndex = currentMockIndex + 1;
            }
            setCurrentMockIndex(nextMockIndex);
          }, 16);
        }
      }, [permissionState, mocks, currentMockIndex, playing]);
      return {
        motion:
          mocks && mocks[currentMockIndex]
            ? { ...mocks[currentMockIndex], timeStamp: new Date().getTime() }
            : null,
        error,
        permissionState, // null/denied/granted
        requestAccess,
        revokeAccess: () => {},
      };
    };
  }
  throw new Error(
    `Incorrect mode passed to withMock: "${mode}" - only accept undefined, RECORD or REPLAY`
  );
};

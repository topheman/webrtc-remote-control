// inspired by https://trekhleb.dev/blog/2021/gyro-web/
import { useCallback, useEffect, useState } from "react";
import lodashThrottle from "lodash/throttle";

export const useDeviceOrientation = ({ precision, throttle = 0 } = {}) => {
  const [error, setError] = useState(null);
  const [orientation, setOrientation] = useState(null);
  const [permissionState, setPermissionState] = useState(null);

  const onDeviceOrientation = lodashThrottle((event) => {
    setOrientation({
      alpha: precision ? Number(event.alpha.toFixed(precision)) : event.alpha,
      beta: precision ? Number(event.beta.toFixed(precision)) : event.beta,
      gamma: precision ? Number(event.gamma.toFixed(precision)) : event.gamma,
    });
  }, throttle);

  const revokeAccessAsync = async () => {
    window.removeEventListener("deviceorientation", onDeviceOrientation);
    setOrientation(null);
  };

  const requestAccessAsync = async () => {
    if (typeof DeviceOrientationEvent === "undefined") {
      setError(
        new Error("Device orientation event is not supported by your browser")
      );
      return false;
    }

    if (
      DeviceOrientationEvent.requestPermission &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      let permission;
      try {
        permission = await DeviceOrientationEvent.requestPermission();
        setPermissionState(permission);
      } catch (err) {
        setError(err);
        return false;
      }
      if (permission !== "granted") {
        setError(
          new Error("Request to access the device orientation was rejected")
        );
        return false;
      }
    }

    window.addEventListener("deviceorientation", onDeviceOrientation);

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
    orientation,
    error,
    permissionState, // null/denied/granted
    requestAccess,
    revokeAccess,
  };
};

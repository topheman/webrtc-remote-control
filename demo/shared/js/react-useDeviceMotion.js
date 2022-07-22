// inspired by https://trekhleb.dev/blog/2021/gyro-web/
import { useCallback, useEffect, useState } from "react";
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

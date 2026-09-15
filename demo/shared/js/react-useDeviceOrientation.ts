// inspired by https://trekhleb.dev/blog/2021/gyro-web/
import { useCallback, useEffect, useState } from "react";
import lodashThrottle from "lodash/throttle";

export interface DeviceOrientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

export interface UseDeviceOrientationOptions {
  precision?: number;
  throttle?: number;
}

export interface UseDeviceOrientationResult {
  orientation: DeviceOrientation | null;
  error: Error | null;
  /** null until a permission prompt has been answered. */
  permissionState: PermissionState | null;
  requestAccess: () => Promise<boolean>;
  revokeAccess: () => Promise<void>;
}

export const useDeviceOrientation = ({
  precision,
  throttle = 0,
}: UseDeviceOrientationOptions = {}): UseDeviceOrientationResult => {
  const [error, setError] = useState<Error | null>(null);
  const [orientation, setOrientation] = useState<DeviceOrientation | null>(
    null,
  );
  const [permissionState, setPermissionState] =
    useState<PermissionState | null>(null);

  const onDeviceOrientation = lodashThrottle(
    (event: DeviceOrientationEvent) => {
      setOrientation({
        // `alpha`, `beta` and `gamma` are nullable on the event. Rounding them
        // unconditionally is what this did before the port; a browser that fires
        // the event with null angles would have thrown then too.
        alpha: precision
          ? Number(event.alpha!.toFixed(precision))
          : event.alpha,
        beta: precision ? Number(event.beta!.toFixed(precision)) : event.beta,
        gamma: precision
          ? Number(event.gamma!.toFixed(precision))
          : event.gamma,
      });
    },
    throttle,
  );

  const revokeAccessAsync = async () => {
    window.removeEventListener("deviceorientation", onDeviceOrientation);
    setOrientation(null);
  };

  const requestAccessAsync = async () => {
    if (typeof DeviceOrientationEvent === "undefined") {
      setError(
        new Error("Device orientation event is not supported by your browser"),
      );
      return false;
    }

    // See `demo/types/device-orientation-permission.d.ts` - the permission API
    // is WebKit-only, so it is intersected on rather than declared globally.
    const orientationEvent =
      DeviceOrientationEvent as typeof DeviceOrientationEvent &
        PermissionRequestableEventConstructor;
    const motionEvent = DeviceMotionEvent as typeof DeviceMotionEvent &
      PermissionRequestableEventConstructor;

    if (
      orientationEvent.requestPermission &&
      typeof motionEvent.requestPermission === "function"
    ) {
      let permission;
      try {
        permission = await orientationEvent.requestPermission();
        setPermissionState(permission);
      } catch (err) {
        setError(err as Error);
        return false;
      }
      if (permission !== "granted") {
        setError(
          new Error("Request to access the device orientation was rejected"),
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
      void revokeAccess();
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

import type { DeviceOrientation } from "../../shared/js/react-useDeviceOrientation";

/** The `[x, y, z]` triple `Phone3D` takes as a rotation. */
export type Rotation = [number, number, number];

export function orientationToRotation(
  orientation: DeviceOrientation | null,
  multiplier = 1,
): Rotation {
  if (orientation) {
    return [
      // The three angles are nullable on the event; multiplying null gives 0,
      // which is what this produced before the port.
      (multiplier * (orientation.alpha ?? 0)) / 360,
      (multiplier * (orientation.beta ?? 0)) / 180,
      (multiplier * (orientation.gamma ?? 0)) / 90,
    ];
  }
  return [0, 0, 0];
}

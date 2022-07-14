export function orientationToRotation(orientation, multiplier = 1) {
  if (orientation) {
    return [
      (multiplier * orientation.alpha) / 360,
      (multiplier * orientation.beta) / 180,
      (multiplier * orientation.gamma) / 90,
    ];
  }
  return [0, 0, 0];
}

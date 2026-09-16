/** One connected remote, as the accelerometer master tracks it. */
export interface RemoteOrientation {
  peerId: string;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  scale?: number;
  color?: string;
  name?: string;
}

/** The messages a remote sends to the accelerometer master. */
export type OrientationAction =
  | {
      type: "ORIENTATION";
      alpha: number | null;
      beta: number | null;
      gamma: number | null;
    }
  | { type: "PING_DOWN" }
  | { type: "PING_UP" }
  | { type: "REMOTE_SET_NAME"; name: string };

export function remotesListReducer(
  state: RemoteOrientation[],
  { data, id }: { data: OrientationAction; id: string },
): RemoteOrientation[] {
  return state.reduce<RemoteOrientation[]>((acc, cur) => {
    if (cur.peerId === id) {
      switch (data.type) {
        case "ORIENTATION":
          acc.push({
            ...cur,
            alpha: data.alpha,
            beta: data.beta,
            gamma: data.gamma,
          });
          break;
        case "PING_DOWN":
          acc.push({
            ...cur,
            scale: 1.1,
            color: "pink",
          });
          break;
        case "PING_UP":
          acc.push({
            ...cur,
            scale: 1,
            color: "#900000",
          });
          break;
        case "REMOTE_SET_NAME":
          acc.push({
            ...cur,
            name: data.name,
          });
          break;
        default:
          acc.push(cur);
          break;
      }
    } else {
      acc.push(cur);
    }
    return acc;
  }, []);
}

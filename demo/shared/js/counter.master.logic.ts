/**
 * One connected remote, as the master tracks it. `name` is set once the remote
 * sends a `REMOTE_SET_NAME`, so it is absent until then.
 */
export interface RemoteCounter {
  peerId: string;
  counter: number;
  name?: string;
}

/** The messages a remote sends to the master in the counter demos. */
export type CounterAction =
  | { type: "COUNTER_INCREMENT" }
  | { type: "COUNTER_DECREMENT" }
  | { type: "REMOTE_SET_NAME"; name: string };

export function counterReducer(
  state: RemoteCounter[],
  { data, id }: { data: CounterAction; id: string },
): RemoteCounter[] {
  return state.reduce<RemoteCounter[]>((acc, cur) => {
    if (cur.peerId === id) {
      switch (data.type) {
        case "COUNTER_INCREMENT":
          acc.push({
            ...cur,
            counter: cur.counter + 1,
          });
          break;
        case "COUNTER_DECREMENT":
          acc.push({
            ...cur,
            counter: cur.counter - 1,
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

export function globalCount(counters: RemoteCounter[]): number {
  return counters.reduce((acc, { counter }) => counter + acc, 0);
}

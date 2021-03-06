export function counterReducer(state, { data, id }) {
  return state.reduce((acc, cur) => {
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

export function globalCount(counters) {
  return counters.reduce((acc, { counter }) => counter + acc, 0);
}

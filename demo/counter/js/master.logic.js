export function counterReducer(state, action, id) {
  console.log(state, action, id);
  return state.reduce((acc, cur) => {
    if (cur.peerId === id) {
      switch (action.type) {
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

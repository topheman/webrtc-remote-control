export function remotesListReducer(state, { data, id }) {
  return state.reduce((acc, cur) => {
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

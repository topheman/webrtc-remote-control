export function remotesListReducer(state, { data, id }) {
  return state.reduce((acc, cur) => {
    if (cur.peerId === id) {
      switch (data.type) {
        case "MOTION":
          acc.push({
            ...cur,
            acceleration: data.acceleration,
            accelerationIncludingGravity: data.accelerationIncludingGravity,
            rotationRate: data.rotationRate,
            interval: data.interval,
            timeStamp: data.timeStamp,
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

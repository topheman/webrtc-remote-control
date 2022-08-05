export function makeRemoteListReducer({ duration = 10000 } = {}) {
  return function remotesListReducer(state, { data, id, type }) {
    switch (type) {
      case "CONNECT":
        return new Map(state.set(id, { motionInfos: [] }));
      case "DISCONNECT": {
        state.delete(id);
        return new Map(state);
      }
      case "MOTION": {
        const newState = new Map(state.entries());
        const currentRemoteOldestFrame = newState.get(id)?.motionInfos[0];
        let newMotionInfos;
        const currentMotionInfos = newState.get(id)?.motionInfos || [];
        if (
          currentRemoteOldestFrame &&
          data.timeStamp - currentRemoteOldestFrame.timeStamp > duration
        ) {
          newMotionInfos = [...currentMotionInfos.slice(1), data];
        } else {
          newMotionInfos = [...currentMotionInfos, data];
        }
        if (newState.get(id)) {
          newState.get(id).motionInfos = newMotionInfos;
        }
        return newState;
      }
      default:
        return state;
    }
  };
}

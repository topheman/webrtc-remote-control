function setCurrentRemote(state, id) {
  if (state.remotes.size === 1) {
    // eslint-disable-next-line no-param-reassign
    state.currentRemote = id;
  } else if (state.remotes.size === 0) {
    // eslint-disable-next-line no-param-reassign
    state.currentRemote = null;
  }
}

export function makeRemoteListReducer({ duration = 10000 } = {}) {
  return function remotesListReducer(state, { data, id, type }) {
    switch (type) {
      case "CONNECT": {
        const newState = {
          ...state,
          remotes: new Map(state.remotes.set(id, { motionInfos: [] })),
        };
        setCurrentRemote(newState, id);
        return newState;
      }
      case "DISCONNECT": {
        state.remotes.delete(id);
        const newState = {
          ...state,
          remotes: new Map(state.remotes),
        };
        setCurrentRemote(newState, id);
        return newState;
      }
      case "MOTION": {
        const newRemotes = new Map(state.remotes.entries());
        const currentRemoteOldestFrame = newRemotes.get(id)?.motionInfos[0];
        let newMotionInfos;
        const currentMotionInfos = newRemotes.get(id)?.motionInfos || [];
        if (
          currentRemoteOldestFrame &&
          data.timeStamp - currentRemoteOldestFrame.timeStamp > duration
        ) {
          newMotionInfos = [...currentMotionInfos.slice(1), data];
        } else {
          newMotionInfos = [...currentMotionInfos, data];
        }
        if (newRemotes.get(id)) {
          newRemotes.get(id).motionInfos = newMotionInfos;
        }
        return {
          ...state,
          remotes: newRemotes,
        };
      }
      case "CURRENT_REMOTE": {
        if (state.remotes.has(id)) {
          return {
            ...state,
            currentRemote: id,
          };
        }
        return state;
      }
      default:
        return state;
    }
  };
}

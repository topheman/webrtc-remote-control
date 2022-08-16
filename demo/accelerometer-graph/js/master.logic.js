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
        const currentMotionInfos = newRemotes.get(id)?.motionInfos || [];
        const newMotionInfos = [...currentMotionInfos, data];
        if (
          newMotionInfos.at(-1).timeStamp - newMotionInfos.at(0).timeStamp >
          duration
        ) {
          newMotionInfos.shift();
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

/**
 * Very light implementation of an eventEmitter (with only what's needed)
 */
export function eventEmitter() {
  const events = {};
  return {
    on(name, callback) {
      events[name] = events[name] || [];
      events[name].push(callback);
    },
    off(name, callback) {
      if (events[name]) {
        if (!callback) {
          // no callback passed -> cleanup all registered callbacks on this event
          events[name] = undefined;
        } else {
          // otherwise, only cleanup the passed callback
          events[name] = events[name].filter((fn) => fn !== callback);
          if (events[name].length === 0) {
            this.events[name] = undefined;
          }
        }
      }
    },
    emit(name, ...args) {
      if (events[name]) {
        // eslint-disable-next-line no-restricted-syntax
        for (const event of events[name]) {
          event(...args);
        }
      }
    },
  };
}

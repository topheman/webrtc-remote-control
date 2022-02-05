/* eslint-disable no-shadow,no-use-before-define,default-param-last */
/**
 * from https://dev.to/selbekk/redux-in-27-lines-2i92
 *
 * Used in previous project https://github.com/topheman/webrtc-experiments/blob/master/src/js/redux-lite.js
 */
export function createStore(initialReducer, initialState = {}, enhancer) {
  if (enhancer) {
    return enhancer(createStore)(initialReducer, initialState);
  }
  let reducer = initialReducer;
  let subscribers = [];
  let state = reducer(initialState, { type: "__INIT__" });
  return {
    getState() {
      return state;
    },
    dispatch(action) {
      state = reducer(state, action);
      subscribers.forEach((subscriber) => subscriber(state));
    },
    subscribe(listener) {
      subscribers.push(listener);
      return () => {
        subscribers = subscribers.filter(
          (subscriber) => subscriber !== listener
        );
      };
    },
    replaceReducer(newReducer) {
      reducer = newReducer;
      this.dispatch({ type: "__REPLACE__" });
    },
  };
}

/**
 * from redux source code - https://github.com/reduxjs/redux/blob/master/src/applyMiddleware.js
 */
export function applyMiddleware(...middlewares) {
  return (createStore) =>
    (...args) => {
      const store = createStore(...args);
      let dispatch = () => {
        throw new Error(
          "Dispatching while constructing your middleware is not allowed. " +
            "Other middleware would not be applied to this dispatch."
        );
      };

      const middlewareAPI = {
        getState: store.getState,
        dispatch: (...args) => dispatch(...args),
      };
      const chain = middlewares.map((middleware) => middleware(middlewareAPI));
      dispatch = compose(...chain)(store.dispatch);

      return {
        ...store,
        dispatch,
      };
    };
}

/**
 * from redux source code - https://github.com/reduxjs/redux/blob/master/src/compose.js
 *
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
export function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  );
}

// todo part of it should be in core (expose humanized error ?)
export function humanizeErrors(errors = []) {
  const transform = [
    [
      /ID ".*" is taken/,
      "You may have this main page opened on an other tab, please close it",
    ],
  ];
  return errors.reduce((errorsList, currentError) => {
    const humanizedCurrentError = transform.reduce(
      (acc, [regExp, replaceError]) => {
        // eslint-disable-next-line no-param-reassign
        acc = currentError.replace(regExp, replaceError);
        return acc;
      },
      currentError
    );
    errorsList.push(humanizedCurrentError);
    return errorsList;
  }, []);
}

export function makeLogger({ onLog = () => {}, logs = [], size = 30 } = {}) {
  function makeLogFunction(type) {
    return function log(payload) {
      // eslint-disable-next-line no-param-reassign
      logs = logs.concat({
        payload,
        key: (logs.slice(-1)[0] || { key: 0 }).key + 1,
        level: type,
      });
      while (logs.length > size) {
        logs.shift();
      }
      // eslint-disable-next-line no-console
      console[type](payload);
      onLog(logs);
      return logs;
    };
  }
  return Object.fromEntries(
    ["log", "info", "warn", "error"].map((level) => [
      level,
      makeLogFunction(level),
    ])
  );
}

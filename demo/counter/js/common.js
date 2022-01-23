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

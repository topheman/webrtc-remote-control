export function makeGetModes(processEnvKey, allowedModes) {
  return function getModes() {
    if (process.env[processEnvKey]) {
      const extractedModes = process.env[processEnvKey].split(",");
      for (const modeToCheck of extractedModes) {
        if (!allowedModes.includes(modeToCheck)) {
          throw new Error(
            `Unsupported ${processEnvKey} "${modeToCheck}", only accepts ${allowedModes.join(
              ", "
            )}`
          );
        }
      }
      return extractedModes;
    }
    return allowedModes;
  };
}

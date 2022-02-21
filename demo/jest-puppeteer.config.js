const SLOW_MO = Number(process.env.SLOW_MO) || 250;

module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== "false",
    product: "chrome",
    slowMo: process.env.HEADLESS !== "false" ? undefined : SLOW_MO,
  },
  browserContext: "default",
};

const SLOW_MO = Number(process.env.SLOW_MO) || 250;

module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== "false",
    product: "chrome",
    // Headless Chromium masks local IPs in ICE candidates behind unresolvable
    // `.local` mDNS names, so peers never establish a data connection.
    // Desktop browsers resolve them via Bonjour, which is why the demo works
    // manually but the suite does not.
    args: ["--disable-features=WebRtcHideLocalIpsWithMdns"],
    slowMo: process.env.HEADLESS !== "false" ? undefined : SLOW_MO,
  },
  browserContext: "default",
};

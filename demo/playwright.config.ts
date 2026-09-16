import { defineConfig, devices } from "@playwright/test";

import type { DemoOptions } from "./e2e/fixtures";

const PREVIEW_PORT = Number(process.env.PORT) || 3001;
const PEER_SERVER_PORT = 9000;

export default defineConfig<DemoOptions>({
  testDir: "./e2e",

  // Every assertion that waits on a peer connection goes through `expect.poll`,
  // so this is the only connection timeout in the suite. It replaces the old
  // `WEBRTC_CONNECTION_TIMEOUT` sleeps, which had to be tuned per environment
  // (600ms locally, 3000ms on CI) because they were spent whether or not the
  // connection was already up. A poll costs what the connection costs.
  expect: { timeout: 20_000 },
  timeout: 90_000,

  // Peers talk to each other through one signaling server and one preview
  // server. Running the mode projects concurrently would put twelve pages and
  // three master peers on them at once; serial keeps failures readable, and
  // dropping the fixed sleeps already buys back far more than parallelism would.
  workers: 1,
  fullyParallel: false,

  // The suite is expected to be deterministic. If a scenario only passes on a
  // second attempt that is a bug in the demo or the library, not noise to be
  // retried away - the Jest suite's `jest.retryTimes(3)` is what hid the
  // reconnection race for a year.
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: `http://localhost:${PREVIEW_PORT}`,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        // Chromium hides local IPs in ICE candidates behind `.local` mDNS
        // names. A desktop browser resolves them through Bonjour; a browser
        // launched from node_modules holds no local-network permission on
        // macOS 15, so signaling succeeds and the data channel never opens.
        // Without this flag every scenario fails with no events at all.
        "--disable-features=WebRtcHideLocalIpsWithMdns",
      ],
    },
  },

  // One project per demo mode, replacing the old `describe.each` over a `MODE`
  // env var. `pnpm run test:e2e --project=vue` now runs one mode.
  projects: [
    {
      name: "vanilla",
      use: { ...devices["Desktop Chrome"], demoMode: "vanilla" },
    },
    {
      name: "react",
      use: { ...devices["Desktop Chrome"], demoMode: "react" },
    },
    { name: "vue", use: { ...devices["Desktop Chrome"], demoMode: "vue" } },
  ],

  // Replaces the `start-server-and-test` chain. Playwright owns both servers,
  // waits for each to answer and tears them down afterwards.
  webServer: [
    {
      // The public peerjs server is unreliable and its default TURN hosts no
      // longer resolve, so the suite always signals through a local one. The
      // demo reads the matching host at build time from
      // VITE_USE_LOCAL_PEER_SERVER - build with `pnpm run build:peer-server`.
      command: "peerjs --port 9000 --key peerjs --path /myapp",
      cwd: "..",
      url: `http://localhost:${PEER_SERVER_PORT}/myapp`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
    {
      // Run from the demo directory, not the workspace root: `vp preview` at
      // the root serves the root, which has no build output, and answers 404
      // to everything without failing to start.
      command: `vp preview --port ${PREVIEW_PORT}`,
      url: `http://localhost:${PREVIEW_PORT}`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
    },
  ],
});

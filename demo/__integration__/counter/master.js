import { getE2eTestServerAddress } from "../../test.helpers";

describe("counter/master", () => {
  beforeAll(async () => {
    await page.goto(getE2eTestServerAddress());
  });

  it('should be titled "webrtc-remote-control"', async () => {
    await expect(page.title()).resolves.toMatch("webrtc-remote-control");
  });
});

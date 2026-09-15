import { describe, expect, it } from "vite-plus/test";
import * as core from "./core.index";

/**
 * The package's three public subpaths are `.`, `./master` and `./remote`. This pins the
 * shape of the root entry point, which is what re-exports the other two.
 */
describe("core.index", () => {
  it("should expose master, remote and prepareUtils", () => {
    expect(Object.keys(core).sort()).toEqual([
      "master",
      "prepareUtils",
      "remote",
    ]);
  });

  it("should expose a default `prepare` factory on both sides", () => {
    expect(typeof core.master.default).toBe("function");
    expect(typeof core.remote.default).toBe("function");
  });

  it("should build a master api surface from prepareUtils", () => {
    const master = core.master.default(core.prepareUtils());
    expect(Object.keys(master).sort()).toEqual([
      "bindConnection",
      "getPeerId",
      "humanizeError",
      "isConnectionFromRemote",
    ]);
  });

  it("should build a remote api surface from prepareUtils", () => {
    const remote = core.remote.default(core.prepareUtils());
    expect(Object.keys(remote).sort()).toEqual([
      "bindConnection",
      "getPeerId",
      "humanizeError",
    ]);
  });
});

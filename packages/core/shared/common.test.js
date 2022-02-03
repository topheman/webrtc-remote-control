import { someUtil } from "./common";

describe("shared/common", () => {
  describe("someUtil", () => {
    it("should should return a correct string", () => {
      expect(someUtil("foo")).toBe("Called some util: foo");
    });
  });
});

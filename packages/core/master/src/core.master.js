// eslint-disable-next-line import/no-relative-packages
import { someUtil } from "../../shared/common";

export function hello() {
  return {
    type: "master",
    message: someUtil("master"),
    mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  };
}

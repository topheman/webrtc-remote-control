// eslint-disable-next-line import/no-relative-packages
import { someUtil } from "../../shared/common";

export function hello() {
  return {
    type: "remote",
    message: someUtil("remote"),
    mode: process.env.NODE_ENV !== "production" ? "development" : "production",
  };
}

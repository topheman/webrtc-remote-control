// eslint-disable-next-line import/no-relative-packages
import { someUtil } from "../../shared/common";

export function hello() {
  console.log("Hello World from master");
  someUtil("master");
}

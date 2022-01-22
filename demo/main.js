import { hello } from "@webrtc-remote-control/core";
import "./style.css";

console.log(hello());

document.querySelector("#app").innerHTML = `
  <h1>Hello Vite!</h1>
  <a href="https://vitejs.dev/guide/features.html" target="_blank">Documentation</a>
`;

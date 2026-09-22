/* eslint-disable no-bitwise,no-plusplus */
import { useMemo } from "react";

// inspired by https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
function makeColor(str = "AZERTY"): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += `00${value.toString(16)}`.substr(-2);
  }
  return colour;
}

// `Phone3D` gives every phone a colour of its own, derived from its peer id so
// the same remote keeps the same one across reconnections. The id arrives a
// moment after the phone first renders, hence the nullable argument.
export function usePhoneColor(peerId?: string | null): string {
  return useMemo(() => makeColor(peerId ?? ""), [peerId]);
}

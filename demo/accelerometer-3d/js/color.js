/* eslint-disable no-bitwise,no-plusplus */
import { useEffect, useState } from "react";

// inspired by https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
function makeColor(str = "AZERTY") {
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

export function usePhoneColor(peerId) {
  const [phoneColor, setPhoneColor] = useState("#900000");
  useEffect(() => {
    setPhoneColor(makeColor(peerId || ""));
  }, [peerId]);
  return phoneColor;
}

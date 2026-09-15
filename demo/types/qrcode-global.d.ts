// Like peerjs, `qrcodejs` is loaded from a CDN `<script>` tag rather than
// bundled, so `QRCode` only exists as a global. The package is unmaintained and
// ships no types, and nothing on DefinitelyTyped matches the 1.0.0 build the
// demo pins, so this declares the sliver of the constructor the
// `qrcode-display` element actually calls.
//
// The root `vite.config.ts` declares `QRCode: "readonly"` in `lint.globals` for
// the same reason it declares `Peer`.
interface QRCodeOptions {
  text?: string;
  width?: number;
  height?: number;
  colorDark?: string;
  colorLight?: string;
}

declare class QRCode {
  constructor(element: Element | string, options?: QRCodeOptions | string);
  clear(): void;
  makeCode(text: string): void;
}

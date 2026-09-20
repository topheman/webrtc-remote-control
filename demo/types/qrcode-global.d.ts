// `qrcodejs` is loaded from a CDN `<script>` tag rather than bundled, so
// `QRCode` only exists as a global. The package is unmaintained and ships no
// types, and nothing on DefinitelyTyped matches the 1.0.0 build the demo pins,
// so this declares the sliver of the constructor the `qrcode-display` element
// actually calls. `declare class` below is what makes it known to Oxlint's
// `no-undef` as well, so there is no `lint.globals` entry to go with it.
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

import type { RefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

// The one WebGL context the whole page draws through. `Phone3D` renders a
// `<View>` per phone - a plain `<div>` that reserves a rectangle in the layout
// - and drei tunnels each one's scene here, where `<View.Port />` renders them
// into this canvas with `gl.scissor`, one rectangle per tracked div. Before
// this, every phone mounted a `<Canvas>` of its own and the master hit
// Chrome's 16-active-contexts cap at the 17th remote, which evicts the oldest
// context and leaves those cards as a broken-image glyph.
export interface PhonesCanvasProps {
  // A ref to an ancestor holding both this canvas and the `<View>` divs.
  eventSource: RefObject<HTMLElement | null>;
}

export default function PhonesCanvas({ eventSource }: PhonesCanvasProps) {
  return (
    <Canvas
      // Pointer events have to be raycast from an element that contains both
      // the canvas and the html, or a `<View>`'s handlers never fire - and
      // `Remote.tsx` presses a phone to send a PING, so this is not
      // hypothetical. Fiber sets `pointer-events: none` on the canvas itself
      // as soon as `eventSource` is given, which is what keeps the page
      // underneath clickable.
      //
      // The cast is fiber's declaration, not ours: it asks for
      // `RefObject<HTMLElement>`, and React 19 reads that `current` as
      // non-nullable, which no ref a caller can actually hand it satisfies -
      // `useRef<T>(null)` is a `RefObject<T | null>`. Fiber only ever reads
      // `.current` at event time, well after it is set.
      eventSource={eventSource as RefObject<HTMLElement>}
      // Fixed and full-viewport so the scissor rectangles line up: drei
      // computes each one from the tracked div's `getBoundingClientRect()`,
      // which is viewport-relative, against the canvas's own bounds. That also
      // makes the phones follow the page as it scrolls for free.
      style={{ position: "fixed", top: 0, left: 0 }}
    >
      <View.Port />
    </Canvas>
  );
}

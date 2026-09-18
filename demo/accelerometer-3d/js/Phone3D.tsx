import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { MeshProps, ThreeEvent } from "@react-three/fiber";
import type { Mesh } from "three";

import { usePhoneColor } from "./color";
import type { Rotation } from "./accelerometer.helpers";

type BoxProps = MeshProps & { color?: string };

function Box({ color = "#900000", ...props }: BoxProps) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef<Mesh>(null);
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh {...props} ref={ref}>
      <boxGeometry args={[3, 5, 0.7]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export interface Phone3DProps {
  width?: number | string;
  height?: number | string;
  rotation: Rotation;
  peerId?: string | null;
  color?: string;
  colorHover?: string;
  scale?: number;
  onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
}

export default function Phone3D({
  // `defaultProps` on a function component is deprecated in React 18 and gone
  // in 19; default parameters do the same thing.
  width = 150,
  height = 150,
  rotation,
  peerId,
  color,
  colorHover,
  scale,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
}: Phone3DProps) {
  const [, y, z] = rotation;
  const [hover, setHover] = useState(false);
  const phoneColor = usePhoneColor(peerId);
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        cursor: hover ? "pointer" : "initial",
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
      }}
    >
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Box
          position={[0, 0, 0]}
          rotation={[y, z, 0]}
          color={hover ? colorHover : (color ?? phoneColor)}
          scale={scale}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerEnter={(e) => {
            if (colorHover) {
              setHover(true);
            }
            onPointerEnter?.(e);
          }}
          onPointerLeave={(e) => {
            if (colorHover) {
              setHover(false);
            }
            onPointerLeave?.(e);
          }}
        />
      </Canvas>
    </div>
  );
}

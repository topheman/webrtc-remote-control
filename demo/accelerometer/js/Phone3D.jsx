import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import PropTypes from "prop-types";

function Box({ color, ...props }) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef();
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh {...props} ref={ref}>
      <boxGeometry args={[3, 5, 0.7]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

Box.defaultProps = {
  color: "#900000",
};

Box.propTypes = {
  color: PropTypes.string,
};

export default function Phone3D({
  width,
  height,
  rotation,
  color,
  colorHover,
  scale,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
}) {
  const [, y, z] = rotation;
  const [hover, setHover] = useState(false);
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
          color={hover ? colorHover : color}
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

Phone3D.defaultProps = {
  width: 150,
  height: 150,
};

Phone3D.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  rotation: PropTypes.arrayOf(PropTypes.number),
  color: PropTypes.string,
  colorHover: PropTypes.string,
  scale: PropTypes.number,
  onPointerEnter: PropTypes.func,
  onPointerLeave: PropTypes.func,
  onPointerDown: PropTypes.func,
  onPointerUp: PropTypes.func,
};

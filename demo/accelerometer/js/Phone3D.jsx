import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import PropTypes from "prop-types";

function Box(props) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef();
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh {...props} ref={ref}>
      <boxGeometry args={[3, 5, 0.7]} />
      <meshStandardMaterial color="#900000" />
    </mesh>
  );
}

export default function Phone3D({ width, height, rotation }) {
  const [, y, z] = rotation;
  return (
    <div style={{ position: "relative", width, height }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Box position={[0, 0, 0]} rotation={[y, z, 0]} />
      </Canvas>
    </div>
  );
}

Phone3D.defaultProps = {
  width: 150,
  height: 150,
};

Phone3D.propTypes = {
  width: PropTypes.number,
  height: PropTypes.number,
  rotation: PropTypes.arrayOf(PropTypes.number),
};

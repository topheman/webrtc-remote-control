import { lazy, Suspense, useRef } from "react";

import CopyPeerId from "./CopyPeerId";
import { orientationToRotation } from "./accelerometer.helpers";
import type { RemoteOrientation } from "./master.logic";

// Both of these pull three in, so both stay behind the same lazy boundary the
// page already had - a master with no remotes connected loads none of it.
const Phone3D = lazy(() => import("./Phone3D"));
const PhonesCanvas = lazy(() => import("./PhonesCanvas"));

export interface RemotesListProps {
  list?: RemoteOrientation[];
}

export default function RemotesList({ list }: RemotesListProps) {
  // Fiber raycasts a `<View>`'s pointer events from this element rather than
  // from the canvas; it has to contain both. See `PhonesCanvas.tsx`.
  const containerRef = useRef<HTMLDivElement>(null);
  if (list && list.length) {
    return (
      <div ref={containerRef}>
        <ul className="remotes-list">
          {list.map(({ peerId, alpha, beta, gamma, scale, color }) => (
            <li className="remote-entry" key={peerId}>
              <div className="remote-header">
                <span className="remote-peer-id" title={peerId}>
                  {peerId}
                </span>
                <CopyPeerId peerId={peerId} />
              </div>
              <Suspense fallback={<div>Loading 3D model ...</div>}>
                <Phone3D
                  rotation={orientationToRotation({ alpha, beta, gamma })}
                  width={150}
                  height={150}
                  peerId={peerId}
                  scale={scale}
                  color={color}
                />
              </Suspense>
              <ul className="remote-orientation">
                <li>
                  {"alpha: "}
                  <span className="angle-value">{alpha}</span>
                </li>
                <li>
                  {"beta: "}
                  <span className="angle-value">{beta}</span>
                </li>
                <li>
                  {"gamma: "}
                  <span className="angle-value">{gamma}</span>
                </li>
              </ul>
            </li>
          ))}
        </ul>
        <Suspense fallback={null}>
          <PhonesCanvas eventSource={containerRef} />
        </Suspense>
      </div>
    );
  }
  return null;
}

import { lazy, Suspense } from "react";

import { orientationToRotation } from "./accelerometer.helpers";
import type { RemoteOrientation } from "./master.logic";

const Phone3D = lazy(() => import("./Phone3D"));

export interface RemotesListProps {
  list?: RemoteOrientation[];
}

export default function RemotesList({ list }: RemotesListProps) {
  if (list && list.length) {
    return (
      <ul>
        {list.map(({ peerId, alpha, beta, gamma, scale }) => (
          <li key={peerId}>
            <span>{peerId}</span>
            <div style={{ display: "flex" }}>
              <Suspense fallback={<div>Loading 3D model ...</div>}>
                <Phone3D
                  rotation={orientationToRotation({ alpha, beta, gamma })}
                  width={150}
                  height={150}
                  peerId={peerId}
                  scale={scale}
                />
              </Suspense>
              <ul>
                <li>alpha: {alpha}</li>
                <li>beta: {beta}</li>
                <li>gamma: {gamma}</li>
              </ul>
            </div>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

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
      <ul className="remotes-list">
        {list.map(({ peerId, alpha, beta, gamma, scale, color }) => (
          <li className="remote-entry" key={peerId}>
            <span className="remote-peer-id" title={peerId}>
              {peerId}
            </span>
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
              <li>alpha: {alpha}</li>
              <li>beta: {beta}</li>
              <li>gamma: {gamma}</li>
            </ul>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

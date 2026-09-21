import { lazy, Suspense } from "react";

import CopyPeerId from "./CopyPeerId";
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
    );
  }
  return null;
}

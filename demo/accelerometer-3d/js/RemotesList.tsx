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
            {/*
              The angles arrive several times a second and their width changes
              with every value, so the rows are laid out label-left,
              value-right rather than centered - a centered row shifts on each
              update and is unreadable. The space after each label is written
              explicitly: it is what the end-to-end suite splits `name: value`
              on, and a formatter moving the `<span>` to its own line would
              otherwise swallow it.
            */}
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

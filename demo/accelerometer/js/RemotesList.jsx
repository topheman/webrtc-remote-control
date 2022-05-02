import React, { lazy, Suspense } from "react";
import PropTypes from "prop-types";

import { orientationToRotation } from "./accelerometer.helpers";

const Phone3D = lazy(() => import("./Phone3D"));

export default function RemotesList({ list }) {
  if (list && list.length) {
    return (
      <ul>
        {list.map(({ peerId, alpha, beta, gamma }) => (
          <li key={peerId}>
            <span>{peerId}</span>
            <div style={{ display: "flex" }}>
              <Suspense fallback={<div>Loading 3D model ...</div>}>
                <Phone3D
                  rotation={orientationToRotation({ alpha, beta, gamma })}
                  width={150}
                  height={150}
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

RemotesList.propTypes = {
  list: PropTypes.arrayOf(
    PropTypes.exact({
      peerId: PropTypes.string,
      alpha: PropTypes.number,
      beta: PropTypes.number,
      gamma: PropTypes.number,
    })
  ),
};

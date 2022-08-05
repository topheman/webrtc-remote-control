import React from "react";
import PropTypes from "prop-types";

export default function RemotesList({ list, showMotionInfos }) {
  if (list && list.size) {
    return (
      <ul>
        {[...list.entries()].map(([peerId, motion]) => (
          <li key={peerId}>
            <span>{peerId}</span>
            {showMotionInfos && (
              <div style={{ display: "flex" }}>
                <ul>
                  <li>acceleration: {JSON.stringify(motion.acceleration)}</li>
                  <li>
                    accelerationIncludingGravity:{" "}
                    {JSON.stringify(motion.accelerationIncludingGravity)}
                  </li>
                  <li>rotationRate: {JSON.stringify(motion.rotationRate)}</li>
                  <li>interval: {JSON.stringify(motion.interval)}</li>
                  <li>timeStamp: {JSON.stringify(motion.timeStamp)}</li>
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

RemotesList.propTypes = {
  list: PropTypes.object,
  showMotionInfos: PropTypes.bool,
};

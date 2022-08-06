import React from "react";
import PropTypes from "prop-types";

export default function RemotesList({ list, showMotionInfos, onRemoteClick }) {
  if (list && list.size) {
    return (
      <ul>
        {[...list.entries()].map(([peerId, motion]) => (
          <li key={peerId}>
            <div
              role="button"
              onClick={() => onRemoteClick(peerId)}
              onKeyUp={({ key }) => {
                if (key !== "Tab") onRemoteClick(peerId);
              }}
              tabIndex="0"
            >
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
            </div>
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
  onRemoteClick: PropTypes.func,
};

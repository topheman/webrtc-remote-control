import React from "react";
import PropTypes from "prop-types";

export default function RemotesList({ list, showMotionInfos, onRemoteClick }) {
  if (list && list.size) {
    return (
      <ul>
        {[...list.entries()].map(([peerId, { motionInfos }]) => {
          const [currentMotion] = motionInfos.slice(-1);
          return (
            <li key={peerId}>
              <div
                role="button"
                onClick={() => onRemoteClick(peerId)}
                onKeyUp={({ key }) => {
                  if (key !== "Tab") onRemoteClick(peerId);
                }}
                tabIndex="0"
              >
                <span>
                  {peerId} - {motionInfos.length}
                </span>
                {showMotionInfos && currentMotion && (
                  <div style={{ display: "flex" }}>
                    <ul>
                      <li>
                        acceleration:{" "}
                        {JSON.stringify(currentMotion.acceleration)}
                      </li>
                      <li>
                        accelerationIncludingGravity:{" "}
                        {JSON.stringify(
                          currentMotion.accelerationIncludingGravity
                        )}
                      </li>
                      <li>
                        rotationRate:{" "}
                        {JSON.stringify(currentMotion.rotationRate)}
                      </li>
                      <li>
                        interval: {JSON.stringify(currentMotion.interval)}
                      </li>
                      <li>
                        timeStamp: {JSON.stringify(currentMotion.timeStamp)}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </li>
          );
        })}
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

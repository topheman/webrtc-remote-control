import React from "react";
import PropTypes from "prop-types";

export default function RemotesList({ list }) {
  if (list && list.length) {
    return (
      <ul>
        {list.map(({ peerId, ...motion }) => (
          <li key={peerId}>
            <span>{peerId}</span>
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

import React from "react";
import PropTypes from "prop-types";

export default function RemotesList({ list }) {
  if (list && list.length) {
    return (
      <ul>
        {list.map(({ peerId, alpha, beta, gamma }) => (
          <li key={peerId}>
            <span>{peerId}</span>
            <div style={{ display: "flex" }}>
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

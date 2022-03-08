import React from "react";
import PropTypes from "prop-types";

export default function RemoteCountControl({ onIncrement, onDecrement }) {
  return (
    <div className="counter-control">
      <button
        type="button"
        className="counter-control-add"
        onClick={() => onIncrement()}
        style={{ marginRight: "2px" }}
      >
        +
      </button>
      <button
        type="button"
        className="counter-control-sub"
        onClick={() => onDecrement()}
        style={{ marginLeft: "2px" }}
      >
        -
      </button>
    </div>
  );
}

RemoteCountControl.propTypes = {
  onIncrement: PropTypes.func,
  onDecrement: PropTypes.func,
};

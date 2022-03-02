import React from "react";
import PropTypes from "prop-types";

export default function CounterControl({
  onIncrement,
  onDecrement,
  onChangeName,
}) {
  return (
    <>
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
      <form
        className="form-set-name"
        action="."
        onSubmit={(e) => {
          e.preventDefault();
          onChangeName(e.target.name.value);
        }}
      >
        <label>
          <input type="text" placeholder="Enter name" name="name" />
          <button type="submit">OK</button>
        </label>
      </form>
    </>
  );
}

CounterControl.propTypes = {
  onIncrement: PropTypes.func,
  onDecrement: PropTypes.func,
  onChangeName: PropTypes.func,
};

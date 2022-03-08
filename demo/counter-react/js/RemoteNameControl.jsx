import React from "react";
import PropTypes from "prop-types";

export default function RemoteNameControl({ onChangeName }) {
  return (
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
  );
}

RemoteNameControl.propTypes = {
  onChangeName: PropTypes.func,
};

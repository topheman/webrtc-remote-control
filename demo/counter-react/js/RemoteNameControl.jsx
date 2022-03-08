import React from "react";
import PropTypes from "prop-types";

export default function RemoteNameControl({
  onChangeName,
  onConfirmName,
  name,
  disabled,
}) {
  return (
    <form
      className="form-set-name"
      action="."
      onSubmit={(e) => {
        e.preventDefault();
        onConfirmName(e.target.name.value);
      }}
      disabled={disabled}
    >
      <label>
        <input
          type="text"
          placeholder="Enter name"
          onChange={(e) => onChangeName(e.target.value)}
          value={name}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled}>
          OK
        </button>
      </label>
    </form>
  );
}

RemoteNameControl.propTypes = {
  onChangeName: PropTypes.func,
  onConfirmName: PropTypes.func,
  name: PropTypes.string,
  disabled: PropTypes.bool,
};

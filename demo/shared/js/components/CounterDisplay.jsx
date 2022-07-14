import React from "react";
import PropTypes from "prop-types";

import "./counter-display";

export default function CounterDisplay({ count }) {
  return (
    <counter-display
      data={JSON.stringify(count)}
      class="global-counter"
    ></counter-display>
  );
}

CounterDisplay.propTypes = {
  count: PropTypes.number,
};

import React from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/console-display";

export default function ConsoleDisplay({ data }) {
  return <console-display data={JSON.stringify(data)}></console-display>;
}

ConsoleDisplay.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.exact({
      key: PropTypes.number,
      level: PropTypes.string,
      payload: PropTypes.object,
    })
  ),
};

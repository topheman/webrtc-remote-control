import React from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/errors-display";

export default function ErrorsDisplay({ data }) {
  return <errors-display data={JSON.stringify(data)}></errors-display>;
}

ErrorsDisplay.propTypes = {
  data: PropTypes.arrayOf(PropTypes.string),
};

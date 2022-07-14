import React from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/footer-display";

export default function FooterDisplay({ from, to }) {
  return <footer-display from={from} to={to}></footer-display>;
}

FooterDisplay.propTypes = {
  from: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  to: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

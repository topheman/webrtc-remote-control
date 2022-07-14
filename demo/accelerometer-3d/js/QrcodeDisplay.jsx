import React from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/qrcode-display";

export default function QrcodeDisplay({ data }) {
  return (
    <qrcode-display
      width="160"
      height="160"
      data={JSON.stringify(data)}
    ></qrcode-display>
  );
}

QrcodeDisplay.propTypes = {
  data: PropTypes.string,
};

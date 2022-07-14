import React from "react";
import PropTypes from "prop-types";

export default function DirectLinkToSourceCode({ mode }) {
  const target = mode.at(0).toUpperCase() + mode.slice(1);
  return (
    <p>
      Direct link to source code:{" "}
      <a
        href={`https://github.com/topheman/webrtc-remote-control/blob/master/demo/accelerometer/js/${target}.jsx`}
      >
        {target}.jsx
      </a>
      {" / "}
      <a href="https://github.com/topheman/webrtc-remote-control/blob/master/demo/accelerometer/js/App.jsx">
        App.jsx
      </a>
    </p>
  );
}

DirectLinkToSourceCode.propTypes = {
  mode: PropTypes.oneOf(["master", "remote"]),
};

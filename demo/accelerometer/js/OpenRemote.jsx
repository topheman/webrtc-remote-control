import React from "react";
import PropTypes from "prop-types";

export default function OpenRemote({ peerId }) {
  return (
    <p>
      👆Snap the the QR code or{" "}
      <a
        className="open-remote"
        target="_blank"
        href={peerId ? `#${peerId}` : ""}
        rel="noreferrer"
        style={{
          ...(!peerId ? { pointerEvents: "none", color: "gray" } : {}),
        }}
      >
        click here
      </a>{" "}
      to open an{" "}
      <strong>other window from where you will control the counters</strong> on{" "}
      this page (like with a remote).
    </p>
  );
}

OpenRemote.propTypes = {
  peerId: PropTypes.string,
};

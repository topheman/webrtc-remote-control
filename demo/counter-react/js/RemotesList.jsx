import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";

import "../../shared/js/components/remotes-list";

export default function RemotesList({ data, onPing, onPingAll }) {
  const ref = useRef(null);
  const onPingAllCallback = useCallback(() => {
    if (onPingAll) {
      onPingAll();
    }
  }, [onPingAll]);
  const onPingCallback = useCallback(
    (e) => {
      if (onPing) {
        onPing(e.detail.id);
      }
    },
    [onPing]
  );
  useEffect(() => {
    // copy the ref to be able to cleanup the right one if it changed
    const refCurrent = ref?.current;
    if (refCurrent) {
      refCurrent.addEventListener("pingAll", onPingAllCallback);
      refCurrent.addEventListener("ping", onPingCallback);
    }
    return () => {
      if (ref) {
        refCurrent.removeEventListener("pingAll", onPingAllCallback);
        refCurrent.removeEventListener("ping", onPingCallback);
      }
    };
  }, [onPingAllCallback, onPingCallback, ref]);
  return <remotes-list data={JSON.stringify(data)} ref={ref}></remotes-list>;
}

RemotesList.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.exact({
      counter: PropTypes.number,
      peerId: PropTypes.string,
      name: PropTypes.string,
    })
  ),
  onPing: PropTypes.func,
  onPingAll: PropTypes.func,
};

import { useEffect, useRef, useCallback } from "react";

import type { RemoteCounter } from "../../shared/js/counter.master.logic";

import "../../shared/js/components/remotes-list";

export interface RemotesListProps {
  data?: RemoteCounter[];
  onPing?: (id: string | null) => void;
  onPingAll?: () => void;
}

export default function RemotesList({
  data,
  onPing,
  onPingAll,
}: RemotesListProps) {
  const ref = useRef<HTMLElementTagNameMap["remotes-list"]>(null);
  const onPingAllCallback = useCallback(() => {
    if (onPingAll) {
      onPingAll();
    }
  }, [onPingAll]);
  const onPingCallback = useCallback(
    (e: HTMLElementEventMap["ping"]) => {
      if (onPing) {
        onPing(e.detail.id);
      }
    },
    [onPing],
  );
  useEffect(() => {
    // copy the ref to be able to cleanup the right one if it changed
    const refCurrent = ref.current;
    if (refCurrent) {
      refCurrent.addEventListener("pingAll", onPingAllCallback);
      refCurrent.addEventListener("ping", onPingCallback);
    }
    return () => {
      if (refCurrent) {
        refCurrent.removeEventListener("pingAll", onPingAllCallback);
        refCurrent.removeEventListener("ping", onPingCallback);
      }
    };
  }, [onPingAllCallback, onPingCallback, ref]);
  return <remotes-list data={data} ref={ref}></remotes-list>;
}

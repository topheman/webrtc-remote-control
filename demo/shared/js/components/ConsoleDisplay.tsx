import type { LogEntry } from "../common";

import "./console-display";

export interface ConsoleDisplayProps {
  data?: LogEntry[];
}

export default function ConsoleDisplay({ data }: ConsoleDisplayProps) {
  return <console-display data={data}></console-display>;
}

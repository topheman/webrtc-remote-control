import { useEffect, useState } from "react";

export interface CopyPeerIdProps {
  peerId: string;
}

/**
 * The master shows each remote's peer id in a card too narrow to hold a uuid,
 * so it is ellipsised - which also makes it impossible to select. This copies
 * the whole id instead.
 */
export default function CopyPeerId({ peerId }: CopyPeerIdProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const onClick = () => {
    // `navigator.clipboard` needs a secure context: https, or localhost. The
    // demo is served over both, but a plain-http tunnel would land here.
    navigator.clipboard?.writeText(peerId).then(
      () => setCopied(true),
      (error: unknown) => {
        console.warn("could not copy the peer id", error);
      },
    );
  };

  return (
    <button
      type="button"
      className="copy-peer-id"
      onClick={onClick}
      title={`Copy ${peerId}`}
      aria-label={`Copy the peer id ${peerId}`}
    >
      {copied ? "✓" : "⧉"}
    </button>
  );
}

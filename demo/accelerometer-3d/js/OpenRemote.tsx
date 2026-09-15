export interface OpenRemoteProps {
  peerId?: string | null;
}

export default function OpenRemote({ peerId }: OpenRemoteProps) {
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
      <strong>other window from where you will control this page</strong> (like
      with a remote).
    </p>
  );
}

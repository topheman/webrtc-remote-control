export interface DirectLinkToSourceCodeProps {
  mode: "master" | "remote";
}

export default function DirectLinkToSourceCode({
  mode,
}: DirectLinkToSourceCodeProps) {
  const target = mode.at(0)!.toUpperCase() + mode.slice(1);
  return (
    <p>
      Direct link to source code:{" "}
      <a
        href={`https://github.com/topheman/webrtc-remote-control/blob/master/demo/accelerometer/js/${target}.tsx`}
      >
        {target}.tsx
      </a>
      {" / "}
      <a href="https://github.com/topheman/webrtc-remote-control/blob/master/demo/accelerometer/js/App.tsx">
        App.tsx
      </a>
    </p>
  );
}

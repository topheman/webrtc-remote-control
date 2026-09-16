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
        href={`https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/${target}.tsx`}
      >
        {target}.tsx
      </a>
      {" / "}
      <a href="https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/js/App.tsx">
        App.tsx
      </a>
      <br />
      Building this with an LLM?{" "}
      <a href="https://github.com/topheman/webrtc-remote-control/blob/master/demo/counter-react/llm.md">
        llm.md
      </a>{" "}
      writes down the behavioural contract the types cannot.
    </p>
  );
}

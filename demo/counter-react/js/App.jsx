import React, { useEffect, useState } from "react";

import Master from "./Master";
import Remote from "./Remote";

export default function App() {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    if (window.location.hash) {
      setMode("remote");
    } else {
      setMode("master");
    }
  }, []);
  return (
    <div>
      {mode === null ? (
        "Loading ..."
      ) : mode === "remote" ? (
        <Remote />
      ) : (
        <Master />
      )}
    </div>
  );
}

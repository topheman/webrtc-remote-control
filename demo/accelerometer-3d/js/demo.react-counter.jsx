import { createRoot } from "react-dom/client";
import App from "./App";
import "../../shared/js/animate"; // todo

const root = createRoot(document.getElementById("content"));
root.render(<App />);

import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Check if we are in the isolated Demosmith recording route
const isDemoRoute = window.location.pathname === "/cleanverse-demo";

const root = createRoot(document.getElementById("root")!);

root.render(<App demoMode={isDemoRoute} />);



import { createRoot } from "react-dom/client";
import App from "./App.tsx";
// Self-hosted fonts: no extra round trip to Google before the first paint
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

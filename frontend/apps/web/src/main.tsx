import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
// import "@packages/charts/styles.css";
// import "@packages/cookie-consent/styles.css";

createRoot(document.getElementById("app")!).render(<App />);

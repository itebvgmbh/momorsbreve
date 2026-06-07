import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import i18n from "@/i18n";
import { parsePath } from "@/i18n/lang";

// Sprache aus dem URL-Präfix bestimmen und VOR dem (Hydrations-)Render setzen,
// damit Client und SSR exakt dieselbe Sprache rendern.
const { lang } = parsePath(window.location.pathname);
if (i18n.language !== lang) {
  i18n.changeLanguage(lang);
}
document.documentElement.lang = lang;

const root = document.getElementById("root")!;

if (root.children.length > 0) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}

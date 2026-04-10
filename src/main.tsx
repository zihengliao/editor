import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { TaggerWindowPanel } from "./tagging/components/TaggerWindowPanel";

const view = new URLSearchParams(window.location.search).get("view");
const isTaggerWindow = view === "tagger";

function TaggerWindowApp() {
  return (
    <main className="h-screen bg-[#14181e] p-4 text-white">
      <h1 className="mb-3 text-lg font-semibold">Tagger</h1>
      <TaggerWindowPanel />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isTaggerWindow ? <TaggerWindowApp /> : <App />}
  </StrictMode>,
);

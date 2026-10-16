import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="shell">
        <h1>Let’s start fresh.</h1>
        <p>
          The workspace could not continue. Reload to clear the session and try
          again.
        </p>
        <button onClick={() => location.reload()}>Reload workspace</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);

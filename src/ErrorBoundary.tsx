import { Component, type ReactNode } from "react";

// Keeps a stray runtime error from blanking the whole app during a live demo —
// shows a friendly recovery card instead.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("Anima error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash__card">
            <div className="crash__title">Anima hit a snag</div>
            <div className="crash__msg">{this.state.error.message || "Something went wrong."}</div>
            <button className="send" onClick={() => location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

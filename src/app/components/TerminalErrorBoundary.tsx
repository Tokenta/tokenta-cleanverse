import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class TerminalErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Terminal render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-8 font-mono text-white">
          <p className="text-[10px] tracking-[0.28em] text-white/40">TERMINAL ERROR</p>
          <p className="mt-4 max-w-lg text-center text-[12px] tracking-[0.06em] text-white/70">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 border border-white px-4 py-2 text-[10px] tracking-[0.2em] hover:bg-white hover:text-black"
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

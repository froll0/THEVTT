import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** shown above the error, e.g. "Il tavolo" */
  area?: string;
  onReset?: () => void;
}

/** Keeps a crash inside one area instead of blanking the whole window. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <b>{this.props.area ?? 'Questa sezione'} ha avuto un problema</b>
        <p className="muted small mono">{error.message}</p>
        <button
          className="btn"
          onClick={() => {
            this.setState({ error: null });
            this.props.onReset?.();
          }}
        >
          Riprova
        </button>
      </div>
    );
  }
}

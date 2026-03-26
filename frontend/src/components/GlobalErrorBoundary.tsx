import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    const token =
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');
    if (token) {
      fetch('/api/v1/platform/error-logs/ingest/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: 'REACT_ERROR',
          message: error.message,
          stacktrace: error.stack ?? '',
          path: window.location.pathname,
          service: 'frontend',
        }),
      }).catch(() => {
        /* swallow */
      });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <p className="text-lg font-medium">Something went wrong.</p>
          <button
            className="text-sm underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

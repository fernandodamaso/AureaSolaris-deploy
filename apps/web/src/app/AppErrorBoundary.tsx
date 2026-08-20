import { Component, type ReactNode } from 'react';
import { ServiceStatusPanel } from './ServiceStatusPanel';

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { failed: boolean };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    // Do not render provider errors or stack traces.
  }

  render() {
    if (this.state.failed) {
      return (
        <ServiceStatusPanel
          title="Não foi possível abrir o aplicativo"
          message="Ocorreu um erro inesperado. Tente novamente."
          onRetry={() => this.setState({ failed: false })}
        />
      );
    }
    return this.props.children;
  }
}

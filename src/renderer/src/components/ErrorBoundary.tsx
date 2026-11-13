import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './StateViews';
import { uz } from '../i18n/uz';

interface State {
  hasError: boolean;
}

/** Renderer'dagi kutilmagan xatolik butun oynani oq ekranga aylantirmasligi uchun. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('renderer.error_boundary', error.message, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorState fullscreen message={uz.errors.unexpected} onRetry={() => window.location.reload()} />
      );
    }
    return this.props.children;
  }
}

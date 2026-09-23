import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState { error: Error | null }

/** Top-level safety net for the routed content: a render error in one page must not
 * blank the whole shell. Recovery path is a full reload (state caches are refetched). */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page-body">
        <div className="panel" role="alert" style={{ padding: '32px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>حدث خطأ غير متوقع</h2>
          <p style={{ margin: '0 0 16px', color: 'var(--ds-text-muted, var(--tfms-muted))' }}>
            تعذر عرض هذا القسم. بياناتك محفوظة ولم تتأثر. أعد تحميل الصفحة للمتابعة.
          </p>
          <button className="primary-button" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</button>
        </div>
      </div>
    )
  }
}

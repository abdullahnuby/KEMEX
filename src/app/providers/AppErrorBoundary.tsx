import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportClientError } from '../../services/telemetry'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportClientError(error, { route: window.location.hash || window.location.pathname, componentStack: info.componentStack ?? undefined })
    if (import.meta.env.DEV) console.error('KEMEX UI error boundary', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="app-error-screen" role="alert">
        <section className="app-error-card" aria-labelledby="app-error-title">
          <span className="app-error-code">KEMEX</span>
          <h1 id="app-error-title">تعذر إكمال عرض هذه الشاشة</h1>
          <p>حدث خطأ غير متوقع في واجهة النظام. أعد تحميل الصفحة للمتابعة، وإذا استمر الخطأ راجع سجل التطبيق.</p>
          <details>
            <summary>تفاصيل تقنية</summary>
            <pre>{this.state.message}</pre>
          </details>
          <button type="button" className="primary-button" onClick={() => window.location.reload()}>إعادة تحميل النظام</button>
        </section>
      </main>
    )
  }
}

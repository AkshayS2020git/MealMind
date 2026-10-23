import React, { Component, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24, background: '#f7f8f4' }}>
          <div style={{ maxWidth: 480, background: '#fff', border: '1px solid #e4eae5', borderRadius: 12, padding: 28, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 10px', color: '#173f31', fontFamily: 'Georgia, serif' }}>Something went wrong</h2>
            <p style={{ color: '#74847d', fontSize: 13, marginBottom: 20 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the workspace.'}
            </p>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              style={{
                border: 0,
                borderRadius: 8,
                background: '#145b42',
                color: '#fff',
                padding: '10px 18px',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)


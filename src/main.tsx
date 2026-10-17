import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Global error handlers to prevent blank/white screen in WebViews
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[Global Error]', event.error || event.message);
    const root = document.getElementById('root');
    if (root && root.innerHTML.trim() === '') {
      root.innerHTML = `
        <div style="padding:24px;font-family:sans-serif;color:#991b1b;background:#fee2e2;min-height:100vh;box-sizing:border-box;">
          <h2 style="margin-top:0;">FarmLog Application Error</h2>
          <p>An unexpected error occurred during startup:</p>
          <pre style="background:#ffffff;padding:12px;border-radius:8px;border:1px solid #fecaca;white-space:pre-wrap;font-size:12px;overflow:auto;">${event.error?.stack || event.message || 'Script execution failed'}</pre>
          <div style="margin-top:16px;display:flex;gap:10px;">
            <button onclick="window.location.reload();" style="padding:10px 18px;background:#15803d;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Reload</button>
            <button onclick="localStorage.clear();sessionStorage.clear();window.location.reload();" style="padding:10px 18px;background:#b91c1c;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;">Clear Storage & Reload</button>
          </div>
        </div>
      `;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Rejection]', event.reason);
  });
}

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[RootErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', color: '#991b1b', background: '#fee2e2', minHeight: '100vh', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0 }}>FarmLog Runtime Notice</h2>
          <p>Something went wrong displaying this screen:</p>
          <pre style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca', whiteSpace: 'pre-wrap', fontSize: '12px', overflow: 'auto' }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 18px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Reload
            </button>
            <button
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}
              style={{ padding: '10px 18px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);

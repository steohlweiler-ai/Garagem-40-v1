
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/typography.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
// Global handler for Unhandled Promise Rejections (Hardening Phase)
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global ErrorBoundary] Unhandled Promise Rejection:', {
    reason: event.reason,
    message: event.reason?.message,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString()
  });
  // Opcional: prever envio para um serviço de telemetria como Sentry/Datadog
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  // TEMPORARILY DISABLED React.StrictMode to debug AbortError
  // Strict Mode causes double-mounting in dev, which may trigger cleanup that aborts requests
  // <React.StrictMode>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
  // </React.StrictMode>
);

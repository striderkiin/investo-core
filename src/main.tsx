import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/theme.css';
import './styles/public-theme.css';
import './styles/client-dashboard-critso.css';
import './index.css';
import { initMonitoring } from './config/monitoring';
import App from './app/App';

initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={() => (
        <div className="d-flex flex-column align-items-center justify-content-center text-center min-vh-100 p-4">
          <h1 className="h4 mb-2">Something went wrong</h1>
          <p className="mb-4 text-body-secondary">
            The error has been reported. Try reloading the page.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

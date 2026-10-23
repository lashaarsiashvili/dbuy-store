import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error resilience: absorb cross-origin script errors from 3rd party widgets/sandboxes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message === 'Script error.' || !event.filename || (typeof event.message === 'string' && event.message.includes('Script error'))) {
      event.preventDefault?.();
      return true;
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (reasonStr.includes('Script error')) {
      event.preventDefault?.();
    }
  }, true);
}

// Global interaction handler: instantly hide faint placeholder text upon mouse click / touch / focus
if (typeof window !== 'undefined') {
  document.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      if (target.placeholder) {
        target.dataset.savedPlaceholder = target.placeholder;
        target.placeholder = '';
      }
    }
  }, true);

  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      if (target.placeholder) {
        target.dataset.savedPlaceholder = target.placeholder;
        target.placeholder = '';
      }
    }
  }, true);

  document.addEventListener('focusout', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      if (target.dataset.savedPlaceholder && !target.value) {
        target.placeholder = target.dataset.savedPlaceholder;
      }
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);




import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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


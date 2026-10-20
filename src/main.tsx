import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';




// Tangani dan saring error internal Firebase Auth, Firestore, & WebSocket agar tidak merusak eksekusi aplikasi
const isIgnoredError = (msg: string) => {
  return (
    msg.includes('WebSocket') ||
    msg.includes('closed without opened') ||
    msg.includes('Could not reach Cloud Firestore backend') || 
    msg.includes('auth/network-request-failed') || 
    msg.includes("Backend didn't respond") || 
    msg.includes('Connection failed') ||
    msg.includes('@firebase/firestore') ||
    msg.includes('INTERNAL ASSERTION FAILED') ||
    msg.includes('Pending promise was never set') ||
    msg.includes('cancelled-popup-request') ||
    msg.includes('_PopupOperation')
  );
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = event.reason?.message || String(event.reason || '');
    if (isIgnoredError(reasonMsg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || event.error?.message || '';
    if (isIgnoredError(errorMsg)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Error ? args[0].message : String(args[0]));
  if (msg && isIgnoredError(msg)) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Error ? args[0].message : String(args[0]));
  if (msg && isIgnoredError(msg)) {
    return;
  }
  originalConsoleWarn(...args);
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

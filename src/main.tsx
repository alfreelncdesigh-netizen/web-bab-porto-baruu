import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';




// Menyembunyikan peringatan offline sementara dari Firebase agar tidak dianggap sebagai error fatal
const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Error ? args[0].message : String(args[0]));
  if (msg && (
    msg.includes('Could not reach Cloud Firestore backend') || 
    msg.includes('auth/network-request-failed') || 
    msg.includes("Backend didn\'t respond") || 
    msg.includes('Connection failed') ||
    msg.includes('@firebase/firestore')
  )) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Error ? args[0].message : String(args[0]));
  if (msg && (
    msg.includes('Could not reach Cloud Firestore backend') || 
    msg.includes('auth/network-request-failed') || 
    msg.includes("Backend didn\'t respond") || 
    msg.includes('Connection failed') ||
    msg.includes('@firebase/firestore')
  )) {
    return;
  }
  originalConsoleWarn(...args);
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

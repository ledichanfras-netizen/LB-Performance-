
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';
import './index.css';

// Register Service Worker for PWA asset caching and offline support
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registrado com sucesso:', registration.scope);
        // Check for SW update on focus / reload
        registration.update().catch(() => {});
      },
      (err) => {
        console.log('Erro ao registrar SW:', err);
      }
    );
  });

  // Reload page when new service worker takes control to get latest changes
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
    <Toaster 
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        className: '',
        style: {
          background: '#334155',
          color: '#fff',
        },
      }}
    />
  </React.StrictMode>
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js'; // .js-Endung beibehalten für Kompatibilität mit tsc-Output, Vite löst das korrekt auf
import './input.css';      // WICHTIG: Import Ihrer Haupt-CSS-Datei

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
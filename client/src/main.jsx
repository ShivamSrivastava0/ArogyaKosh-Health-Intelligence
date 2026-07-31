import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster 
            position="top-right" 
            toastOptions={{
              className: 'font-sans text-sm',
              duration: 4000,
              style: {
                borderRadius: '0.5rem',
                background: '#333',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10b981',
                }
              },
              error: {
                style: {
                  background: '#ef4444',
                }
              }
            }} 
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

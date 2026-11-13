import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './components/ui/Overlay';
import App from './App';
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const tree = (
  <BrowserRouter>
    <AuthProvider>
      <ConfirmProvider>
        <App />
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3500,
            style: { background: '#0B2239', color: '#fff', borderRadius: '999px', fontSize: '14px', padding: '10px 16px' },
            success: { iconTheme: { primary: '#2DD4BF', secondary: '#0B2239' } },
            error: { iconTheme: { primary: '#FF8A7A', secondary: '#0B2239' } },
          }}
        />
      </ConfirmProvider>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{tree}</GoogleOAuthProvider> : tree}
  </React.StrictMode>,
);

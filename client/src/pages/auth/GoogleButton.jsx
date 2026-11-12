import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';

/** Renders only when a Google client ID is configured for the web app. */
export default function GoogleButton() {
  const { google } = useAuth();
  const navigate = useNavigate();
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  return (
    <div className="flex justify-center">
      <GoogleLogin
        shape="pill"
        width="400"
        text="continue_with"
        onSuccess={async ({ credential }) => {
          try { await google(credential); navigate('/app'); } catch (e) { toast.error(errorMessage(e)); }
        }}
        onError={() => toast.error('Google sign-in was cancelled')}
      />
    </div>
  );
}

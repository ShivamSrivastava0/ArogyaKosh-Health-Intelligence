import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi2';
import { verifyEmail } from '../../services/authService';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';

export default function VerifyEmail() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setLoading(false);
      setSuccess(false);
      setMessage('Invalid verification token');
    }
  }, [token]);

  const handleVerification = async () => {
    try {
      setLoading(true);
      const res = await verifyEmail(token);
      setSuccess(true);
      setMessage(res.message || 'Email verified successfully!');
    } catch (err) {
      setSuccess(false);
      setMessage(err.response?.data?.message || err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full text-center py-8">
        <Loader size="lg" text="Verifying your email address..." />
      </div>
    );
  }

  return (
    <div className="w-full text-center space-y-6">
      {success ? (
        <>
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <HiCheckCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
            <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">{message}</p>
          </div>
          <div className="pt-4">
            <Link to="/dashboard">
              <Button variant="primary" className="w-full shadow-lg shadow-emerald-500/20">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <HiXCircle className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Verification Failed</h2>
            <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">{message}</p>
          </div>
          <div className="pt-4">
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

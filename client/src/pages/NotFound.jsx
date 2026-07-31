import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="relative">
        <h1 className="text-9xl font-black text-slate-100">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">Page Not Found</span>
        </div>
      </div>
      <p className="text-slate-500 max-w-md mt-4 mb-8">
        We couldn't find the page you're looking for. It might have been moved, deleted, or possibly never existed.
      </p>
      <Button 
        onClick={() => navigate('/')} 
        leftIcon={<HiOutlineArrowLeft className="w-5 h-5" />}
        size="lg"
      >
        Go to Dashboard
      </Button>
    </div>
  );
}

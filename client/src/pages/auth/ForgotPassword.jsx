import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiCheckCircle, HiArrowLeft } from 'react-icons/hi2';
import { forgotPassword } from '../../services/authService';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      await forgotPassword(data.email);
      setSubmittedEmail(data.email);
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <HiCheckCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Check Your Email</h2>
          <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
            If an account exists for <strong className="text-slate-800">{submittedEmail}</strong>, we've sent instructions to reset your password.
          </p>
        </div>
        <div className="pt-4">
          <Link to="/login">
            <Button variant="outline" className="w-full inline-flex items-center justify-center gap-2">
              <HiArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center sm:text-left mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
        <p className="text-slate-500 mt-2 text-sm">
          Enter your registered email address and we'll send you a password reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="name@example.com"
          icon={HiOutlineEnvelope}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email address is required',
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: 'Please enter a valid email address',
            },
          })}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full shadow-lg shadow-emerald-500/20"
          loading={isSubmitting}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-8 text-center border-t border-slate-200 pt-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <HiArrowLeft className="w-4 h-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

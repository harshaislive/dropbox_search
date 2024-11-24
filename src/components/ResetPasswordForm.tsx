import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ResetPasswordForm: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [message, setMessage] = useState('');
  
  const { initiatePasswordReset, verifyResetOtp, resetPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (step === 'email') {
        const result = await initiatePasswordReset(email);
        if (result.success) {
          setMessage('OTP sent to your email');
          setStep('otp');
        }
      } else if (step === 'otp') {
        const verified = await verifyResetOtp(email, otp);
        if (verified) {
          setStep('password');
        }
      } else if (step === 'password') {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        const success = await resetPassword(email, newPassword);
        if (success) {
          setMessage('Password reset successful! You can now login.');
          setTimeout(onCancel, 2000);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Password
        </h2>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {message && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">{message}</p>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {step === 'email' && (
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {step === 'otp' && (
          <div>
            <label htmlFor="otp" className="sr-only">
              OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {step === 'password' && (
          <>
            <div>
              <label htmlFor="newPassword" className="sr-only">
                New Password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
          >
            {isLoading ? 'Processing...' : step === 'email' ? 'Send OTP' : step === 'otp' ? 'Verify OTP' : 'Reset Password'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResetPasswordForm } from './ResetPasswordForm'; // Assuming ResetPasswordForm is in the same directory

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [registrationData, setRegistrationData] = useState<{ email: string; username: string } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { login, register, verifyOtp, resendOtp, isLoading } = useAuth();

  // Timer effect for OTP resend
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (showOtpField) {
        if (!otp) {
          setError('Please enter OTP');
          return;
        }
        if (!registrationData) {
          setError('Registration data not found');
          return;
        }

        const verified = await verifyOtp(registrationData.email, otp);
        if (!verified) {
          setError('Invalid OTP. Please try again.');
        }
        return;
      }

      if (isLogin) {
        if (!username || !password) {
          setError('Please fill in all fields');
          return;
        }
        await login(username, password);
      } else {
        if (!username || !email || !password || !confirmPassword) {
          setError('Please fill in all fields');
          return;
        }

        try {
          const response = await register(username, email, password, confirmPassword);
          if (response.success) {
            setRegistrationData({ email, username });
            setShowOtpField(true);
            setTimeLeft(300); // 5 minutes
            setError('OTP has been sent to your email');
          }
        } catch (err: any) {
          // Check if it's an existing account error
          if (err.message?.includes('Account already exists')) {
            setError('Account already exists. Click "Sign in" below to login.');
          } else if (err.message?.includes('Email is already registered')) {
            setError('This email is already registered. Click "Sign in" below to login.');
          } else if (err.message?.includes('Username is already taken')) {
            setError('This username is already taken. Please choose a different username.');
          } else {
            throw err; // Re-throw other errors
          }
        }
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed' : 'Registration failed'));
    }
  };

  const handleResendOtp = async () => {
    if (!registrationData || timeLeft > 0) return;

    try {
      await resendOtp(registrationData.email, registrationData.username);
      setTimeLeft(300); // Reset timer to 5 minutes
      setError('OTP has been resent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setShowOtpField(false);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setTimeLeft(0);
    setRegistrationData(null);
  };

  if (showResetPassword) {
    return <ResetPasswordForm onCancel={() => setShowResetPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            src="https://beforest.co/wp-content/uploads/2024/10/23-Beforest-Black-with-Tagline.png#6421"
            alt="Beforest Logo"
            className="mx-auto h-16 w-auto"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : showOtpField ? 'Enter OTP' : 'Create new account'}
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`rounded-md p-4 text-sm ${
              error.includes('OTP has been sent') || error.includes('OTP has been resent')
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <p>{error}</p>
              {error.includes('Click "Sign in"') && (
                <button
                  type="button"
                  onClick={() => {
                    switchMode();
                    setUsername(username); // Keep the username if they entered it
                  }}
                  className="mt-2 text-brand hover:text-brand-dark font-medium"
                >
                  Click here to sign in
                </button>
              )}
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            {!showOtpField ? (
              <>
                <div>
                  <label htmlFor="username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="sr-only">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="otp" className="sr-only">
                    OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                    placeholder="Enter OTP sent to your email"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {timeLeft > 0 && (
                  <div className="text-center text-sm text-gray-500">
                    Resend OTP available in {formatTime(timeLeft)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#6b9e45] hover:bg-[#5b8a3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b9e45]'
              }`}
            >
              {isLoading
                ? 'Processing...'
                : isLogin
                ? 'Sign in'
                : showOtpField
                ? 'Verify OTP'
                : 'Register'}
            </button>

            {showOtpField && (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || timeLeft > 0}
                className={`text-sm font-medium focus:outline-none ${
                  isLoading || timeLeft > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-[#6b9e45] hover:text-[#5b8a3a]'
                }`}
              >
                Resend OTP
              </button>
            )}

            {!showOtpField && (
              <button
                type="button"
                onClick={switchMode}
                disabled={isLoading}
                className="text-sm font-medium text-[#6b9e45] hover:text-[#5b8a3a] focus:outline-none"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            )}
          </div>
          {isLogin && (
            <div className="text-sm text-right">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="font-medium text-brand hover:text-brand-dark"
              >
                Forgot password?
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
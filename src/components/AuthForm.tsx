import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { login, register, verifyOtp, resendOtp } = useAuth();

  const validateEmail = (email: string) => {
    return email.endsWith('@beforest.co');
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      if (!username || !password) {
        setError('Please fill in all fields');
        return;
      }

      try {
        await login(username, password);
      } catch (err: any) {
        setError(err.message || 'Login failed');
      }
    } else {
      if (!username || !email || !password) {
        setError('Please fill in all fields');
        return;
      }

      if (!validateEmail(email)) {
        setError('Only @beforest.co email addresses are allowed');
        return;
      }

      try {
        const response = await register(username, email, password);
        if (response.success) {
          setRegistrationData({ username, email });
          setShowOtpField(true);
          setTimeLeft(300); // 5 minutes
        }
      } catch (err: any) {
        setError(err.message || 'Registration failed');
      }
    }
  };

  const handleResendOtp = async () => {
    if (registrationData && timeLeft <= 0) {
      try {
        await resendOtp(registrationData);
        setTimeLeft(300); // Reset timer to 5 minutes
        setError('OTP has been resent to your email');
      } catch (err) {
        setError('Failed to resend OTP');
      }
    }
  };

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
          <div className="rounded-md shadow-sm -space-y-px">
            {!showOtpField && (
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
                      placeholder="Email (@beforest.co)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </>
            )}
            
            {showOtpField && (
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

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#6b9e45] hover:bg-[#5b8a3a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6b9e45]"
            >
              {isLogin ? 'Sign in' : showOtpField ? 'Verify OTP' : 'Register'}
            </button>

            {showOtpField && (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timeLeft > 0}
                className={`text-sm font-medium focus:outline-none ${
                  timeLeft > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-[#6b9e45] hover:text-[#5b8a3a]'
                }`}
              >
                Resend OTP
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setShowOtpField(false);
                setError('');
                setOtp('');
                setTimeLeft(0);
              }}
              className="text-[#6b9e45] hover:text-[#5b8a3a] text-sm font-medium focus:outline-none"
            >
              {isLogin ? 'Need an account? Register' : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
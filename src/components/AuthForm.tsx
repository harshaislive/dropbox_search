import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState(''); // Used for registration
  const [email, setEmail] = useState(''); // Used for login and registration
  const [password, setPassword] = useState(''); // Kept for registration, though not used by OTP logic
  const [confirmPassword, setConfirmPassword] = useState(''); // Kept for registration
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // New state for success messages
  const [showOtpField, setShowOtpField] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  // Renamed registrationData to pendingOtpVerification
  const [pendingOtpVerification, setPendingOtpVerification] = useState<{ email: string; usernameForOtpEmail: string } | null>(null);
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
    setSuccess('');

    try {
      if (showOtpField) {
  console.log('[DEBUG] Submitting OTP:', otp, 'for email:', pendingOtpVerification?.email);
        if (!otp) {
          setError('Please enter OTP');
          return;
        }
        if (!pendingOtpVerification) { // Updated variable name
          setError('Verification data not found. Please try again.');
          return;
        }

        const verified = await verifyOtp(pendingOtpVerification.email, otp);
        if (!verified) {
          setError('Invalid OTP. Please try again.');
        } else {
          setSuccess('OTP verified successfully! Redirecting...');
          setError('');
          setOtp('');
          setShowOtpField(false); // Reset OTP field
          setPendingOtpVerification(null); // Clear pending data
          // Redirect or update UI as needed, e.g., to dashboard
          window.location.href = '/'; // Example redirect
        }
        return;
      }

      if (isLogin) {
        if (!email) { // Email is now the primary field for login
          setError('Please enter your email');
          return;
        }
        await login(email); // Call updated login with email only
        setPendingOtpVerification({ email, usernameForOtpEmail: email.split('@')[0] }); // Store email for OTP verification
        setShowOtpField(true);
        setTimeLeft(300); // 5 minutes for OTP
        setSuccess('OTP has been sent to your email. Please check and enter it below.');
      } else { // Registration flow
        if (!username || !email || !password || !confirmPassword) {
          setError('Please fill in all fields for registration');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const response = await register(username, email, password, confirmPassword);
        if (response.success) {
          setPendingOtpVerification({ email, usernameForOtpEmail: username }); // Store email and username for OTP verification
          setShowOtpField(true);
          setTimeLeft(300); // 5 minutes for OTP
          setSuccess('Registration successful! OTP has been sent to your email.');
          setError(''); // Clear previous errors
        }
        // No explicit 'else' for response.success === false, as register throws an error on failure
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Login failed' : 'Registration failed'));
      setSuccess('');
    }
  };

  const handleResendOtp = async () => {
    if (!pendingOtpVerification || timeLeft > 0) return; // Updated variable name

    try {
      await resendOtp(pendingOtpVerification.email, pendingOtpVerification.usernameForOtpEmail);
      setTimeLeft(300); // Reset timer to 5 minutes
      setSuccess('OTP has been resent to your email.');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
      setSuccess('');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setShowOtpField(false);
    setError('');
    setSuccess('');
    // Clear fields based on mode
    setEmail(''); // Email is common, but good to clear on switch
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setTimeLeft(0);
    setPendingOtpVerification(null); // Clear pending data
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
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            {!showOtpField ? (
              <>
                {isLogin ? (
                  <div>
                    <label htmlFor="email-address" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email-address"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                ) : (
                  // Registration fields
                  <>
                    <div>
                      <label htmlFor="username" className="sr-only">
                        Username
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="email-address-register" className="sr-only">
                        Email address
                      </label>
                      <input
                        id="email-address-register"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="password" className="sr-only">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                        autoComplete="new-password"
                        required
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-[#6b9e45] focus:border-[#6b9e45] focus:z-10 sm:text-sm"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </>
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

          {error && (
            <div className="text-red-500 text-sm text-center mt-2">{error}</div>
          )}
          {success && (
            <div className="text-green-500 text-sm text-center mt-2">{success}</div>
          )}

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
        </form>
      </div>
    </div>
  );
};
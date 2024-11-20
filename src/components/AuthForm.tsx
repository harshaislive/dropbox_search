import React, { useState } from 'react';
import { Key } from 'lucide-react';

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const [appKey, setAppKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Store the access token
      localStorage.setItem('dropboxAccessToken', appKey);
      onSuccess();
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-center mb-6">
        <Key className="w-12 h-12 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
        Connect to Dropbox
      </h2>
      <p className="text-sm text-gray-600 mb-6 text-center">
        Enter your Dropbox access token to connect to your account.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={appKey}
            onChange={(e) => setAppKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your Dropbox access token"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-500 text-center">
        You can find your access token in your Dropbox App Console under Settings &gt; OAuth 2
      </p>
    </div>
  );
};
import React from 'react';
import { validateRequiredEnv } from '../config/env';

interface EnvironmentErrorProps {
  feature?: string;
  onDismiss?: () => void;
}

export const EnvironmentError: React.FC<EnvironmentErrorProps> = ({ 
  feature = "this application", 
  onDismiss 
}) => {
  const validation = validateRequiredEnv();

  if (validation.isValid) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 m-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Configuration Required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p className="mb-3">
              Some environment variables are missing for {feature} to work properly:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {validation.missing.map(variable => (
                <li key={variable} className="font-mono text-xs bg-amber-100 px-2 py-1 rounded">
                  {variable}
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 bg-amber-100 rounded">
              <h4 className="text-xs font-semibold text-amber-800 mb-2">
                💡 To fix this in Railway:
              </h4>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal pl-4">
                <li>Go to your Railway dashboard</li>
                <li>Select your project</li>
                <li>Click on "Variables" tab</li>
                <li>Add the missing environment variables listed above</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          </div>
          {onDismiss && (
            <div className="mt-4">
              <button
                type="button"
                className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 py-1 rounded transition-colors"
                onClick={onDismiss}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentError; 
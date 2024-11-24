import React, { useState, useEffect } from 'react';

export const UserCounter: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState(0);

  // In a real app, this would connect to a WebSocket or polling endpoint
  useEffect(() => {
    const updateCount = () => {
      // Simulate some random activity
      const baseCount = 15; // Minimum number of users
      const randomActivity = Math.floor(Math.random() * 5); // Random fluctuation
      setActiveUsers(baseCount + randomActivity);
    };

    // Update initially
    updateCount();

    // Update every 30 seconds
    const interval = setInterval(updateCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg text-sm text-gray-600 flex items-center space-x-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>{activeUsers} active users</span>
    </div>
  );
};

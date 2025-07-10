import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({
  message = 'Loading...',
  centered = false,
  className = ''
}) => {
  const containerClasses = centered
    ? 'flex items-center justify-center py-12'
    : 'flex items-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
      {message && (
        <span className="text-gray-600 text-sm">{message}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
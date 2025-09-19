'use client';
import React, { useEffect, useState } from 'react';

export function Toast({ message, type = 'success', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = type === 'success' ? 'bg-green-600' : 
                 type === 'error' ? 'bg-red-600' : 
                 type === 'warning' ? 'bg-yellow-500' : 'bg-blue-600';

  return (
    <div className={`fixed bottom-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center animate-fade-in`}>
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default Toast;
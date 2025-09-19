'use client';

import { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';

export default function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === 'undefined') return;
    
    // Check if user is logged in
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    fetchUnreadCount();
    
    // Set up interval to check for new notifications
    const intervalId = setInterval(fetchUnreadCount, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) return;
      
      const notifications = await response.json();
      const unread = notifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications count:', error);
    }
  };
  
  if (unreadCount === 0) {
    return (
      <FaBell size={14} />
    );
  }
  
  return (
    <div className="relative">
      <FaBell size={14} />
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    </div>
  );
}
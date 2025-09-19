'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { FaBell, FaCheck, FaArrowLeft, FaHotel, FaPlane, FaMoon, FaSun, FaUser, FaSignOutAlt } from 'react-icons/fa';
import CartDropdown from '@/components/CartDropdown';

function NotificationsPageContent() {
  const { user, initialized, authFetch, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Apply dark mode class and save preference
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Handle clicks outside of user menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isUserMenuOpen && 
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
      return;
    }

    if (initialized && user) {
      fetchNotifications();
    }
  }, [initialized, user, router]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationIds) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationIds })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      setNotifications(prevNotifications =>
        prevNotifications.map(notif =>
          notificationIds.includes(notif.id)
            ? { ...notif, isRead: true }
            : notif
        )
      );

    } catch (err) {
      console.error('Error marking notifications as read:', err);
      setError(err.message);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications
      .filter(notification => !notification.isRead)
      .map(notification => notification.id);

    if (unreadIds.length === 0) return;

    await markAsRead(unreadIds);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead([notification.id]);
    }

    if (notification.relatedBookingId) {
      router.push(`/bookings/${notification.relatedBookingId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_created':
      case 'booking_cancelled':
        return <FaPlane className={darkMode ? "text-blue-400" : "text-blue-500"} />;
      case 'hotel_booking_cancelled':
      case 'new_reservation':
        return <FaHotel className={darkMode ? "text-blue-400" : "text-blue-500"} />;
      default:
        return <FaBell className={darkMode ? "text-blue-400" : "text-blue-500"} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === today.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (initialized && !user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Navigation bar */}
      <nav className={`${darkMode ? 'bg-gray-800 shadow-md' : 'bg-white shadow-md'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>
                  FlyNext
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${
                  darkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } transition-colors duration-300`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>

              {/* Cart dropdown */}
              <CartDropdown />

              {/* User menu */}
              <div className="relative">
                <button
                  ref={userButtonRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                    darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  } transition-colors duration-300`}
                >
                  {user.profilePictureUrl ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <Image 
                        src={user.profilePictureUrl} 
                        alt="Profile picture"
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <FaUser />
                  )}
                  <span>{user.firstName || 'Account'}</span>
                </button>
                
                {isUserMenuOpen && (
                  <div 
                    ref={userMenuRef}
                    className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                      darkMode 
                      ? 'bg-gray-800 ring-1 ring-black ring-opacity-5' 
                      : 'bg-white ring-1 ring-black ring-opacity-5'
                    } transition-colors duration-300`}
                  >
                    <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} transition-colors duration-300`}>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>Signed in as</p>
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-300`}>{user.email}</p>
                    </div>
                    
                    <Link href="/profile" 
                      className={`block px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors duration-300 flex items-center gap-2`}>
                      <FaUser size={14} />
                      <span>Profile</span>
                    </Link>
                    
                    <button 
                      onClick={handleLogout}
                      className={`block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-300`}
                    >
                      <FaSignOutAlt size={14} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <div className="max-w-4xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={handleGoBack} 
              className={`mr-4 ${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'} transition-colors duration-300`}
            >
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Notifications</h1>
          </div>

          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className={`flex items-center text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors duration-300`}
            >
              <FaCheck className="mr-1" />
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className={`border rounded-md p-4 mb-4 ${
            darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-800'
          } transition-colors duration-300`}>
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className={`rounded-lg shadow p-8 text-center ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } transition-colors duration-300`}>
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
            } transition-colors duration-300`}>
              <FaBell className={`${darkMode ? 'text-blue-400' : 'text-blue-500'} text-2xl transition-colors duration-300`} />
            </div>
            <h2 className={`text-xl font-medium mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            } transition-colors duration-300`}>No notifications yet</h2>
            <p className={`${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            } transition-colors duration-300`}>
              We'll notify you here when there are updates about your bookings or travel plans.
            </p>
          </div>
        ) : (
          <div className={`shadow-md rounded-lg divide-y ${
            darkMode 
            ? 'bg-gray-800 divide-gray-700' 
            : 'bg-white divide-gray-200'
          } transition-colors duration-300`}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 cursor-pointer transition-colors ${
                  !notification.isRead 
                    ? darkMode 
                      ? 'bg-blue-900/20 hover:bg-blue-900/30' 
                      : 'bg-blue-50 hover:bg-blue-100'
                    : darkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-blue-900/30' : 'bg-blue-100'
                    } transition-colors duration-300`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm font-medium ${
                        !notification.isRead 
                          ? darkMode ? 'text-white' : 'text-gray-900' 
                          : darkMode ? 'text-gray-300' : 'text-gray-700'
                      } transition-colors duration-300`}>
                        {notification.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      } transition-colors duration-300`}>
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <p className={`text-sm ${
                      !notification.isRead 
                        ? darkMode ? 'text-gray-200' : 'text-gray-900' 
                        : darkMode ? 'text-gray-400' : 'text-gray-600'
                    } transition-colors duration-300`}>
                      {notification.message}
                    </p>

                    {notification.relatedBookingId && (
                      <div className="mt-2">
                        <Link
                          href={`/bookings/${notification.relatedBookingId}`}
                          className={`text-xs hover:underline ${
                            darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
                          } transition-colors duration-300`}
                          onClick={e => e.stopPropagation()}
                        >
                          View booking details
                        </Link>
                      </div>
                    )}
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        darkMode ? 'bg-blue-400' : 'bg-blue-600'
                      } transition-colors duration-300`}></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors duration-300">Loading notifications...</p>
        </div>
      </div>
    }>
      <NotificationsPageContent />
    </Suspense>
  );
}
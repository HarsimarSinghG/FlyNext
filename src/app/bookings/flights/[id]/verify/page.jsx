'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import CartDropdown from '@/components/CartDropdown';
import { 
  FaCheck, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaArrowLeft, 
  FaPlane, 
  FaSuitcase, 
  FaTicketAlt, 
  FaClipboardCheck,
  FaMoon,
  FaSun,
  FaUser,
  FaSignOutAlt,
  FaBell,
  FaCalendarAlt
} from 'react-icons/fa';

function FlightVerificationContent() {
  const { id } = useParams();
  const router = useRouter();
  const { user, authFetch, logout } = useAuth();
  
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Refs for user menu
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  
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
  
  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatStr) => {
    if (!dateString) return '';
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  useEffect(() => {
    async function fetchVerification() {
      setLoading(true);
      setError(null);
      
      try {
        if (!user) {
          router.push('/login?redirect=/bookings');
          return;
        }
        
        // Use the auth fetch from context
        const response = await authFetch(`/api/flights/${id}/verify`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to verify flight');
        }
        
        const data = await response.json();
        setVerification(data);
      } catch (error) {
        console.error('Error verifying flight:', error);
        setError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchVerification();
    }
  }, [id, router, user, authFetch]);
  
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };
  
  // Generate status badge
  const getStatusBadge = (status) => {
    switch(status?.toUpperCase()) {
      case 'CONFIRMED':
      case 'SCHEDULED':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
          } transition-colors duration-300`}>
            <FaCheck className="mr-1" /> {status}
          </span>
        );
      case 'DELAYED':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
          } transition-colors duration-300`}>
            <FaExclamationTriangle className="mr-1" /> {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
          } transition-colors duration-300`}>
            <FaExclamationTriangle className="mr-1" /> {status}
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
          } transition-colors duration-300`}>
            {status || 'UNKNOWN'}
          </span>
        );
    }
  };
  
  // Render loading state
  if (!user) {
    return null; // Will redirect in useEffect
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
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
              <CartDropdown darkMode={darkMode} />

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
                    
                    <Link href="/notifications" 
                      className={`block px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors duration-300 flex items-center gap-2`}>
                      <FaBell size={14} />
                      <span>Notifications</span>
                    </Link>
                    
                    <Link href="/bookings" 
                      className={`block px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} transition-colors duration-300 flex items-center gap-2`}>
                      <FaCalendarAlt size={14} />
                      <span>My Bookings</span>
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button 
            onClick={handleGoBack} 
            className={`inline-flex items-center ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            } transition-colors duration-300`}>
            <FaArrowLeft className="mr-2" /> Back to Booking
          </button>
        </div>

        {/* Render loading state */}
        {loading ? (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-8 text-center transition-colors duration-300`}>
            <FaSpinner className={`mx-auto h-12 w-12 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            } animate-spin mb-6 transition-colors duration-300`} />
            <h1 className={`text-xl font-medium ${
              darkMode ? 'text-white' : 'text-gray-700'
            } transition-colors duration-300`}>Verifying Flight Status...</h1>
            <p className={`${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            } mt-2 transition-colors duration-300`}>We're checking your flight status with the airline.</p>
          </div>
        ) : error ? (
          // Render error state
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-8 text-center transition-colors duration-300`}>
            <FaExclamationTriangle className={`mx-auto h-16 w-16 ${
              darkMode ? 'text-yellow-400' : 'text-yellow-400'
            } mb-6 transition-colors duration-300`} />
            <h1 className={`text-2xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            } mb-4 transition-colors duration-300`}>Verification Failed</h1>
            <p className={`${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            } mb-6 transition-colors duration-300`}>{error}</p>
            <Link 
              href="/bookings"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
            >
              <FaArrowLeft className="mr-2" /> Back to Bookings
            </Link>
          </div>
        ) : verification ? (
          // If verification data is available
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden transition-colors duration-300`}>
            {/* Header Section */}
            <div className={`p-6 ${
              verification.verified
                ? darkMode ? 'bg-green-900/20' : 'bg-green-50'
                : darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'
            } border-b ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            } transition-colors duration-300`}>
              <div className="flex items-start">
                <div className={`p-2 rounded-full ${
                  verification.verified
                    ? darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                    : darkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
                } transition-colors duration-300`}>
                  {verification.verified ? (
                    <FaCheck className="h-6 w-6" />
                  ) : (
                    <FaExclamationTriangle className="h-6 w-6" />
                  )}
                </div>
                <div className="ml-4">
                  <h1 className={`text-lg font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>
                    Flight {verification.verified ? 'Confirmed' : 'Status Update'}
                  </h1>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  } transition-colors duration-300`}>
                    Last verified: {safeFormatDate(verification.lastVerified, 'PPpp')}
                  </p>
                </div>
                <div className="ml-auto">
                  {getStatusBadge(verification.status)}
                </div>
              </div>
            </div>
            
            {/* Flight Info */}
            <div className="p-6">
              <h2 className={`text-lg font-medium ${
                darkMode ? 'text-white' : 'text-gray-900'
              } mb-4 flex items-center transition-colors duration-300`}>
                <FaPlane className={`mr-2 ${
                  darkMode ? 'text-blue-400' : 'text-blue-600'
                } transition-colors duration-300`} /> Flight Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Airline</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{verification.airline}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Flight Number</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{verification.flightNumber}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Origin</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{verification.origin}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Destination</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{verification.destination}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Departure Time</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{safeFormatDate(verification.departureTime, 'PPp')}</p>
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } transition-colors duration-300`}>Arrival Time</p>
                  <p className={`text-base ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  } transition-colors duration-300`}>{safeFormatDate(verification.arrivalTime, 'PPp')}</p>
                </div>
              </div>
              
              {/* Booking Reference */}
              <div className={`border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              } pt-6 mt-6 transition-colors duration-300`}>
                <h2 className={`text-lg font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } mb-4 flex items-center transition-colors duration-300`}>
                  <FaTicketAlt className={`mr-2 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  } transition-colors duration-300`} /> Booking Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    } transition-colors duration-300`}>Booking Reference</p>
                    <p className={`text-base font-mono ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    } p-2 rounded transition-colors duration-300`}>{verification.bookingReference}</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    } transition-colors duration-300`}>Ticket Number</p>
                    <p className={`text-base font-mono ${
                      darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'
                    } p-2 rounded transition-colors duration-300`}>{verification.ticketNumber}</p>
                  </div>
                </div>
              </div>
              
              {/* Status Message */}
              <div className={`border-t ${
                darkMode ? 'border-gray-700' : 'border-gray-200'
              } pt-6 mt-6 transition-colors duration-300`}>
                <h2 className={`text-lg font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } mb-4 flex items-center transition-colors duration-300`}>
                  <FaClipboardCheck className={`mr-2 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  } transition-colors duration-300`} /> Status
                </h2>
                
                <div className={`p-4 ${
                  verification.verified
                    ? darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'
                    : darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-50 text-yellow-700'
                } rounded-md transition-colors duration-300`}>
                  <p>{verification.message}</p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className={`px-6 py-4 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            } border-t ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            } transition-colors duration-300`}>
              <div className="flex flex-wrap justify-between items-center">
                <Link 
                  href="/bookings"
                  className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md ${
                    darkMode 
                    ? 'border-gray-600 text-white bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  } transition-colors duration-300`}
                >
                  <FaArrowLeft className="mr-2" /> Back to Bookings
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function FlightVerificationPage() {
  const [darkMode, setDarkMode] = useState(false);

  // Initialize dark mode for the loading state
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);
  
  return (
    <Suspense fallback={
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      } transition-colors duration-300`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto transition-colors duration-300`}></div>
          <p className={`mt-4 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          } transition-colors duration-300`}>Loading verification page...</p>
        </div>
      </div>
    }>
      <FlightVerificationContent />
    </Suspense>
  );
}
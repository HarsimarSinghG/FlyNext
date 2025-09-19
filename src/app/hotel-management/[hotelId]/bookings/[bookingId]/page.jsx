"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { format, differenceInDays } from 'date-fns';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaCalendarAlt, FaUser, FaHotel, FaEnvelope, FaExclamationTriangle, FaBed } from 'react-icons/fa';

function BookingDetailsContent() {
  const { hotelId, bookingId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, authFetch, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Fetch booking details when component mounts
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
      return;
    }

    if (initialized && user) {
      fetchBookingDetails();
    }
  }, [initialized, user, hotelId, bookingId, router]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchBookingDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await authFetch(`/api/hotels/${hotelId}/bookings/${bookingId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      
      const data = await response.json();
      console.log('Booking details:', data);
      setBooking(data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setActionLoading(true);
      
      const response = await authFetch(`/api/hotels/${hotelId}/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel booking');
      }
      
      setSuccessMessage(`Booking has been cancelled successfully`);
      setConfirmCancel(false);
      
      // Refresh booking details
      fetchBookingDetails();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const baseClasses = "px-3 py-1 text-sm rounded-full font-medium";
    
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return `${baseClasses} ${darkMode ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800'}`;
      case 'pending':
        return `${baseClasses} ${darkMode ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800'}`;
      case 'cancelled':
        return `${baseClasses} ${darkMode ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800'}`;
      case 'completed':
        return `${baseClasses} ${darkMode ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-800'}`;
      default:
        return `${baseClasses} ${darkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'MMMM d, yyyy');
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const getDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '';
    return differenceInDays(new Date(checkOut), new Date(checkIn)) + ' nights';
  };

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (initialized && !user) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <FaCalendarAlt className="mr-2" /> Booking Details
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full shadow-sm transition-all duration-300"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mr-3"></div>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaCalendarAlt className="mr-2" /> Booking Details
                {booking && (
                  <span className={`ml-3 ${getStatusBadgeClass(booking.status)}`}>
                    {booking.status}
                  </span>
                )}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDarkMode}
                className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full shadow-sm transition-all duration-300"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link 
            href={`/hotel-management/${hotelId}/bookings`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            Back to All Bookings
          </Link>
          
          <Link 
            href={`/hotel-management/${hotelId}`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaHotel className="mr-2" />
            Back to Hotel
          </Link>
        </div>

        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-800'} border px-6 py-4 rounded mb-6`}>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className={`${darkMode ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-800'} border px-6 py-4 rounded mb-6`}>
            <p>{successMessage}</p>
          </div>
        )}

        {!booking ? (
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 mb-6 border`}>
            <div className="flex flex-col items-center justify-center py-12">
              <FaExclamationTriangle className={`h-16 w-16 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'} mb-4`} />
              <p className={`text-xl font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Booking Not Found</p>
              <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>The booking you're looking for doesn't exist or you don't have permission to view it.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Booking Info */}
            <div className="lg:col-span-2">
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 mb-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaCalendarAlt className="mr-2 text-blue-500" /> Booking Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Booking ID</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.bookingId || booking.id}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Booking Date</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(booking.createdAt)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room Type</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.roomType?.name || 'Standard Room'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Number of Rooms</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.numberOfRooms} {booking.numberOfRooms === 1 ? 'room' : 'rooms'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Number of Guests</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.numberOfGuests} {booking.numberOfGuests === 1 ? 'guest' : 'guests'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check-in Date</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(booking.checkInDate)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check-out Date</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(booking.checkOutDate)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Duration</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {getDuration(booking.checkInDate, booking.checkOutDate)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Price</p>
                    <p className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatPrice(booking.totalPrice)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                    <p className={getStatusBadgeClass(booking.status)}>
                      {booking.status}
                    </p>
                  </div>
                </div>
                
                {booking.specialRequests && (
                  <div className="mt-4">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Special Requests</p>
                    <p className={`italic ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700'} p-3 rounded mt-1`}>{booking.specialRequests}</p>
                  </div>
                )}
              </div>

              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 mb-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaUser className="mr-2 text-blue-500" /> Guest Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Guest Name</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {booking.booking?.user 
                        ? `${booking.booking.user.firstName || ''} ${booking.booking.user.lastName || ''}`.trim() 
                        : 'Unknown Guest'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email Address</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.booking?.user?.email || 'No email provided'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone Number</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.booking?.user?.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 mb-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaBed className="mr-2 text-blue-500" /> Booking Actions
                </h2>
                
                <div className="space-y-3">
                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button
                      onClick={() => setConfirmCancel(true)}
                      disabled={actionLoading}
                      className={`w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ${
                        actionLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {actionLoading ? 'Processing...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
                
                <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h3 className={`text-lg font-medium mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <FaEnvelope className="mr-2 text-blue-500" /> Contact Guest
                  </h3>
                  <a
                    href={`mailto:${booking.booking?.user?.email}`}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 block text-center"
                  >
                    Send Email
                  </a>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 border`}>
                <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaCalendarAlt className="mr-2 text-blue-500" /> Booking Timeline
                </h2>
                
                <div className="space-y-6">
                  {/* Created */}
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-3 h-3 bg-green-600 rounded-full mt-1.5"></div>
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Booking Created</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(booking.createdAt)}</p>
                    </div>
                  </div>
                  
                  {/* Current Status */}
                  <div className="flex">
                    <div className="flex-shrink-0 mr-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${
                        booking.status === 'confirmed' ? 'bg-green-600' :
                        booking.status === 'cancelled' ? 'bg-red-600' :
                        booking.status === 'completed' ? 'bg-blue-600' : 'bg-yellow-600'
                      }`}></div>
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Current Status: {booking.status}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last updated: {formatDate(booking.updatedAt || booking.createdAt)}</p>
                    </div>
                  </div>
                  
                  {/* Future Events */}
                  {booking.status !== 'cancelled' && new Date(booking.checkInDate) > new Date() && (
                    <div className="flex">
                      <div className="flex-shrink-0 mr-3">
                        <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded-full mt-1.5`}></div>
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Check-in (Upcoming)</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(booking.checkInDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  {booking.status !== 'cancelled' && new Date(booking.checkOutDate) > new Date() && (
                    <div className="flex">
                      <div className="flex-shrink-0 mr-3">
                        <div className={`w-3 h-3 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded-full mt-1.5`}></div>
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>Check-out (Upcoming)</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(booking.checkOutDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmCancel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'} rounded-lg p-6 max-w-md w-full border shadow-xl`}>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <FaExclamationTriangle className="text-red-500 mr-2" /> Confirm Cancellation
              </h3>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Are you sure you want to cancel this booking? This action cannot be undone and will release the room inventory back to availability.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setConfirmCancel(false)}
                  className={`px-4 py-2 rounded transition-colors duration-300 ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  No, Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={actionLoading}
                  className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-300 ${
                    actionLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {actionLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Yes, Cancel Booking'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingDetails() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    }>
      <BookingDetailsContent />
    </Suspense>
  );
}
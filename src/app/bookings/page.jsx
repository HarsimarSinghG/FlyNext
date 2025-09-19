'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import CartDropdown from '@/components/CartDropdown';
import { 
  FaPlane, 
  FaHotel, 
  FaReceipt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaSpinner,
  FaSort,
  FaSearch,
  FaMoon,
  FaSun,
  FaUser,
  FaSignOutAlt,
  FaBell,
  FaArrowLeft
} from 'react-icons/fa';

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { user, authFetch, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/bookings');
      return;
    }
    
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await authFetch('/api/bookings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError(err.message || 'Failed to load your bookings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [user, router, authFetch]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.push('/');
  };

  // Format price as currency
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
    }).format(price);
  };

  // Get status badge based on booking status
  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
          } transition-colors duration-300`}>
            <FaCheckCircle className="mr-1" /> Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
          } transition-colors duration-300`}>
            <FaTimesCircle className="mr-1" /> Cancelled
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
          } transition-colors duration-300`}>
            <FaInfoCircle className="mr-1" /> Pending
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
          } transition-colors duration-300`}>
            {status}
          </span>
        );
    }
  };

  // Extract location from address string (just for display purposes)
  const extractLocationFromAddress = (address) => {
    if (!address) return 'N/A';
    
    // Simple parsing - assuming format might be like "123 Main St, City, Country"
    const parts = address.split(',');
    if (parts.length > 1) {
      // Return the city part (second-to-last) or last part
      return parts[parts.length - 2]?.trim() || parts[parts.length - 1]?.trim();
    }
    return address;
  };

  // Filter and sort bookings
  const filteredAndSortedBookings = bookings
    .filter(booking => {
      // Apply status filter
      if (filterStatus !== 'all' && booking.status.toLowerCase() !== filterStatus) {
        return false;
      }
      
      // Apply search filter (case insensitive)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in booking ID
        if (booking.id.toLowerCase().includes(searchLower)) {
          return true;
        }
        
        // Search in hotel bookings
        const hotelMatch = booking.hotelBookings?.some(hb => 
          hb.hotel?.name.toLowerCase().includes(searchLower) ||
          hb.hotel?.address?.toLowerCase().includes(searchLower)
        );
        
        if (hotelMatch) return true;
        
        // Search in flight bookings
        const flightMatch = booking.flightBookings?.some(fb => 
          fb.departureAirportCode.toLowerCase().includes(searchLower) ||
          fb.arrivalAirportCode.toLowerCase().includes(searchLower)
        );
        
        if (flightMatch) return true;
        
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return sortOrder === 'asc' 
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        case 'price':
          return sortOrder === 'asc' 
            ? a.totalPrice - b.totalPrice
            : b.totalPrice - a.totalPrice;
        default:
          return 0;
      }
    });

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
                      className={`block px-4 py-2 text-sm ${darkMode ? 'bg-gray-700 text-white' : 'bg-blue-50 text-blue-700'} transition-colors duration-300 flex items-center gap-2`}>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button 
            onClick={handleGoBack} 
            className={`inline-flex items-center ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            } transition-colors duration-300`}>
            <FaArrowLeft className="mr-2" /> Back to Home
          </button>
        </div>
        
        <div className={`text-center mb-8 ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className={`mt-2 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
            View and manage all your travel bookings
          </p>
        </div>
        
        {error && (
          <div className={`mb-8 ${
            darkMode 
            ? 'bg-red-900/30 border-red-700 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-700'
          } border px-4 py-3 rounded relative transition-colors duration-300`}>
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Filters and sorting */}
        <div className={`mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between gap-4 transition-colors duration-300`}>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-grow max-w-xs">
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'border border-gray-300 text-gray-900 placeholder-gray-500'
                } transition-colors duration-300`}
              />
              <FaSearch className={`absolute left-3 top-3 ${
                darkMode ? 'text-gray-400' : 'text-gray-400'
              } transition-colors duration-300`} />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'border border-gray-300 text-gray-900'
              } transition-colors duration-300`}
            >
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            } transition-colors duration-300`}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'border border-gray-300 text-gray-900'
              } transition-colors duration-300`}
            >
              <option value="date">Booking Date</option>
              <option value="price">Price</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className={`p-2 ${
                darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'
              } transition-colors duration-300`}
              aria-label="Toggle sort order"
            >
              <FaSort />
              <span className="sr-only">{sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}</span>
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className={`animate-spin ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            } text-4xl transition-colors duration-300`} />
          </div>
        ) : (
          <>
            {/* No bookings message */}
            {bookings.length === 0 ? (
              <div className={`text-center py-12 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-lg shadow transition-colors duration-300`}>
                <FaInfoCircle className={`mx-auto ${
                  darkMode ? 'text-gray-600' : 'text-gray-400'
                } text-5xl mb-4 transition-colors duration-300`} />
                <h3 className={`text-lg font-medium ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } mb-2 transition-colors duration-300`}>No bookings found</h3>
                <p className={`${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                } mb-6 transition-colors duration-300`}>You haven't made any bookings yet.</p>
                <div className="flex justify-center space-x-4">
                  <Link 
                    href="/hotels"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
                  >
                    <FaHotel className="mr-2" /> Find Hotels
                  </Link>
                  <Link 
                    href="/flights"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-300"
                  >
                    <FaPlane className="mr-2" /> Book Flights
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Results count */}
                {filteredAndSortedBookings.length !== bookings.length && (
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  } transition-colors duration-300`}>
                    Showing {filteredAndSortedBookings.length} of {bookings.length} bookings
                  </p>
                )}
                
                {/* Booking list */}
                {filteredAndSortedBookings.map((booking) => (
                  <div key={booking.id} className={`${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  } rounded-lg shadow overflow-hidden hover:shadow-md transition-all`}>
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                        <div>
                          <h3 className={`text-lg font-medium ${
                            darkMode ? 'text-white' : 'text-gray-900'
                          } transition-colors duration-300`}>
                            Booking #{booking.id.substring(0, 8)}
                          </h3>
                          <p className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          } transition-colors duration-300`}>
                            <FaCalendarAlt className="inline mr-1" />
                            Booked on {format(new Date(booking.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        
                        <div className="mt-2 sm:mt-0 flex items-center">
                          {getStatusBadge(booking.status)}
                          <span className={`ml-4 text-lg font-semibold ${
                            darkMode ? 'text-blue-400' : 'text-blue-600'
                          } transition-colors duration-300`}>
                            {formatPrice(booking.totalPrice)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {/* Hotel bookings */}
                        {booking.hotelBookings && booking.hotelBookings.length > 0 && (
                          <div>
                            <h4 className={`text-sm font-medium ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            } mb-1 transition-colors duration-300`}>
                              <FaHotel className="inline mr-1" /> 
                              Hotel {booking.hotelBookings.length > 1 ? 'Bookings' : 'Booking'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {booking.hotelBookings.map((hotelBooking) => (
                                <div 
                                  key={hotelBooking.id} 
                                  className={`text-sm ${
                                    darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50'
                                  } p-2 rounded transition-colors duration-300`}
                                >
                                  <div className={`font-medium ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  } transition-colors duration-300`}>{hotelBooking.hotel?.name || 'Hotel'}</div>
                                  <div>
                                    <FaMapMarkerAlt className="inline mr-1 text-xs" />
                                    {extractLocationFromAddress(hotelBooking.hotel?.address)}
                                  </div>
                                  <div>
                                    <span>{hotelBooking.roomType?.name || 'Room'}</span> &bull;{' '}
                                    <span>{hotelBooking.numberOfRooms} room(s)</span>
                                  </div>
                                  <div>
                                    {format(new Date(hotelBooking.checkInDate), 'MMM d, yyyy')} - {format(new Date(hotelBooking.checkOutDate), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Flight bookings */}
                        {booking.flightBookings && booking.flightBookings.length > 0 && (
                          <div>
                            <h4 className={`text-sm font-medium ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            } mb-1 transition-colors duration-300`}>
                              <FaPlane className="inline mr-1" /> 
                              Flight {booking.flightBookings.length > 1 ? 'Bookings' : 'Booking'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {booking.flightBookings.map((flightBooking) => (
                                <div 
                                  key={flightBooking.id} 
                                  className={`text-sm ${
                                    darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50'
                                  } p-2 rounded transition-colors duration-300`}
                                >
                                  <div className={`font-medium ${
                                    darkMode ? 'text-white' : 'text-gray-900'
                                  } transition-colors duration-300`}>
                                    {flightBooking.departureAirportCode} → {flightBooking.arrivalAirportCode}
                                  </div>
                                  <div>
                                    Departure: {format(new Date(flightBooking.departureTime), 'MMM d, yyyy h:mm a')}
                                  </div>
                                  <div>
                                    Arrival: {format(new Date(flightBooking.arrivalTime), 'MMM d, yyyy h:mm a')}
                                  </div>
                                  <div>
                                    Passengers: {
                                      // Handle passengers data which is Json in the schema
                                      typeof flightBooking.passengers === 'object' 
                                        ? Object.keys(flightBooking.passengers).length 
                                        : 1
                                    }
                                  </div>
                                  {flightBooking.afsBookingReference && (
                                    <div className={`text-xs ${
                                      darkMode ? 'text-gray-400' : 'text-gray-500'
                                    } transition-colors duration-300`}>
                                      Ref: {flightBooking.afsBookingReference}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className={`flex flex-wrap gap-2 mt-4 pt-3 border-t ${
                        darkMode ? 'border-gray-700' : 'border-gray-100'
                      } transition-colors duration-300`}>
                        <Link
                          href={`/bookings/${booking.id}`}
                          className={`inline-flex items-center px-3 py-1.5 text-sm font-medium ${
                            darkMode 
                            ? 'text-blue-400 bg-blue-900/30 hover:bg-blue-900/50' 
                            : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                          } rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                        >
                          <FaInfoCircle className="mr-1.5" />
                          View Details
                        </Link>
                        
                        {booking.invoice && (
                          <Link
                            href={booking.invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium ${
                              darkMode 
                              ? 'text-green-400 bg-green-900/30 hover:bg-green-900/50' 
                              : 'text-green-700 bg-green-50 hover:bg-green-100'
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300`}
                          >
                            <FaReceipt className="mr-1.5" />
                            Invoice
                          </Link>
                        )}
                        
                        {booking.status.toLowerCase() === 'confirmed' && (
                          <Link
                            href={`/bookings/${booking.id}?action=cancel`}
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium ${
                              darkMode 
                              ? 'text-red-400 bg-red-900/30 hover:bg-red-900/50' 
                              : 'text-red-700 bg-red-50 hover:bg-red-100'
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300`}
                          >
                            <FaTimesCircle className="mr-1.5" />
                            Cancel
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BookingsPage() {
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
          } transition-colors duration-300`}>Loading your bookings...</p>
        </div>
      </div>
    }>
      <BookingsPageContent />
    </Suspense>
  );
}
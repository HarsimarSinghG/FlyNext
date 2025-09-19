"use client";

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaSearch, FaFilter, FaSort, FaEye, FaBed, FaHotel, FaCalendarAlt, FaTimesCircle, FaCheckCircle, FaEllipsisV } from 'react-icons/fa';

function HotelBookingsContent() {
  const { hotelId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, authFetch, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('checkInDate');
  const [sortDirection, setSortDirection] = useState('asc');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
const [darkMode, setDarkMode] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ];

  const sortOptions = [
    { value: 'checkInDate', label: 'Check-in Date' },
    { value: 'checkOutDate', label: 'Check-out Date' },
    { value: 'createdAt', label: 'Booking Date' },
    { value: 'totalPrice', label: 'Price' }
  ];

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

  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
      return;
    }

    if (initialized && user) {
      fetchHotelAndBookings();
    }
  }, [initialized, user, hotelId, currentPage, filterStatus, sortBy, sortDirection, router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortBy, sortDirection, searchTerm]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchHotelAndBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const hotelResponse = await authFetch(`/api/hotels/${hotelId}`);
      
      if (!hotelResponse.ok) {
        throw new Error('Failed to fetch hotel details');
      }
      
      const hotelData = await hotelResponse.json();
      setHotel(hotelData);
      
      let bookingsUrl = `/api/hotels/${hotelId}/bookings`;
      
      // Add query parameters
      const params = new URLSearchParams();
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortDirection', sortDirection);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      params.append('page', currentPage);
      
      if (params.toString()) {
        bookingsUrl += `?${params.toString()}`;
      }
      
      console.log('Fetching bookings from:', bookingsUrl);
      
      const bookingsResponse = await authFetch(bookingsUrl);
      
      if (!bookingsResponse.ok) {
        const errorData = await bookingsResponse.json();
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }
      
      const bookingsData = await bookingsResponse.json();
      console.log('Bookings data:', bookingsData);
      
      setDebugInfo(bookingsData);
      
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData);
        setTotalPages(1); // If API doesn't return pagination info
      } else if (bookingsData.bookings && Array.isArray(bookingsData.bookings)) {
        setBookings(bookingsData.bookings);
        setTotalPages(bookingsData.totalPages || 1);
      } else {
        setBookings([]);
        setTotalPages(1);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchHotelAndBookings();
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchHotelAndBookings();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      setActionLoading(true);
      setActiveDropdownId(null);
      
      const response = await authFetch(`/api/hotels/${hotelId}/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update booking status');
      }
      
      setSuccessMessage(`Booking status updated to ${newStatus}`);
      
      fetchHotelAndBookings();
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleDropdown = (id) => {
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  const getStatusBadgeClass = (status) => {
    const base = darkMode ? 'text-white font-medium ' : '';
    
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return base + (darkMode ? 'bg-green-700' : 'bg-green-100 text-green-800');
      case 'pending':
        return base + (darkMode ? 'bg-yellow-700' : 'bg-yellow-100 text-yellow-800');
      case 'cancelled':
        return base + (darkMode ? 'bg-red-700' : 'bg-red-100 text-red-800');
      case 'completed':
        return base + (darkMode ? 'bg-blue-700' : 'bg-blue-100 text-blue-800');
      default:
        return base + (darkMode ? 'bg-gray-700' : 'bg-gray-100 text-gray-800');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (err) {
      console.error('Date formatting error:', err);
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    
    try {
      const num = parseFloat(amount);
      return isNaN(num) ? 'N/A' : `$${num.toFixed(2)}`;
    } catch (err) {
      return 'N/A';
    }
  };

  // Handle clicks outside of active dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdownId && !event.target.closest('.dropdown-container')) {
        setActiveDropdownId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownId]);

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (initialized && !user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaCalendarAlt className="mr-2" /> Hotel Bookings
                {hotel && <span className="ml-2">- {hotel.name}</span>}
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

      <div className="container mx-auto p-4 max-w-6xl">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link 
            href={`/hotel-management/${hotelId}`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            Back to Hotel Dashboard
          </Link>
          
          <Link 
            href="/hotel-management"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaHotel className="mr-2" />
            All Hotels
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

        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 mb-8 border`}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between space-y-4 md:space-y-0 mb-6">
            <div className="w-full md:w-1/3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by guest name or email"
                    className={`w-full px-4 py-2 pr-20 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-700 placeholder-gray-500'
                    }`}
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={clearSearch}
                      className={`absolute inset-y-0 right-12 flex items-center p-2 ${
                        darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`absolute inset-y-0 right-0 flex items-center px-4 border-l rounded-r-md ${
                      darkMode 
                        ? 'bg-gray-600 border-gray-500 text-gray-200 hover:bg-gray-500' 
                        : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FaSearch className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0">
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value} className={darkMode ? 'bg-gray-700' : ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={`block w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} className={darkMode ? 'bg-gray-700' : ''}>
                      Sort by: {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className={`flex items-center justify-center px-4 py-2 border rounded-md transition-colors duration-300 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
                    : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                }`}
              >
                {sortDirection === 'asc' ? (
                  <>
                    <FaSort className="mr-2 rotate-180" />
                    Ascending
                  </>
                ) : (
                  <>
                    <FaSort className="mr-2" />
                    Descending
                  </>
                )}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mr-3"></div>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading bookings...</p>
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <FaCalendarAlt className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className={`mt-2 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No bookings found</h3>
              <p className="mt-1">
                {searchTerm || filterStatus !== 'all' ? 
                  'Try adjusting your search or filters to find what you\'re looking for.' : 
                  'When you receive bookings, they\'ll appear here.'}
              </p>
              
              {debugInfo && (
                <div className="mt-6">
                  <details className={`text-left p-4 rounded text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <summary className={`cursor-pointer ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Show API Response (Debug)</summary>
                    <pre className={`mt-3 p-3 rounded overflow-auto max-h-96 text-xs ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800'}`}>
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Booking ID
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Guest
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Room Type
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Check-in Date
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Check-out Date
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Total
                    </th>
                    <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th scope="col" className={`px-6 py-3 text-center text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
                  {bookings.map((booking) => {
                    const guestName = booking.booking?.user 
                      ? `${booking.booking.user.firstName || ''} ${booking.booking.user.lastName || ''}`.trim() 
                      : 'Unknown Guest';
                    const guestEmail = booking.booking?.user?.email || 'No email';
                    const bookingId = booking.bookingId || booking.id;
                    
                    return (
                      <tr key={bookingId} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {bookingId 
                            ? `${bookingId.substring(0, 8)}...` 
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{guestName}</div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{guestEmail}</div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {booking.roomType?.name || 'Standard Room'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatDate(booking.checkInDate)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {formatDate(booking.checkOutDate)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(booking.status)}`}>
                            {booking.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center space-x-2">
                            <Link 
                              href={`/hotel-management/${hotelId}/bookings/${bookingId}`}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                            >
                              <FaEye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Link>
                            
                            <div className="relative dropdown-container">
                              <button 
                                onClick={() => toggleDropdown(bookingId)}
                                className={`text-gray-400 hover:text-gray-200 p-1.5 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                              >
                                <FaEllipsisV className="h-4 w-4" />
                              </button>
                              
                              {activeDropdownId === bookingId && (
                                <div 
                                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 ${
                                    darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                    <button 
                                      onClick={() => handleStatusChange(bookingId, 'cancelled')}
                                      disabled={actionLoading}
                                      className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                                        darkMode 
                                          ? 'text-red-400 hover:bg-gray-600' 
                                          : 'text-red-600 hover:bg-gray-100'
                                      }`}
                                    >
                                      <FaTimesCircle className="mr-2 h-4 w-4" />
                                      Cancel Booking
                                    </button>
                                  )}
                                  
                                  {booking.status === 'confirmed' && new Date(booking.checkOutDate) < new Date() && (
                                    <button 
                                      onClick={() => handleStatusChange(bookingId, 'completed')}
                                      disabled={actionLoading}
                                      className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                                        darkMode 
                                          ? 'text-green-400 hover:bg-gray-600' 
                                          : 'text-green-600 hover:bg-gray-100'
                                      }`}
                                    >
                                      <FaCheckCircle className="mr-2 h-4 w-4" />
                                      Mark as Completed
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className={`flex justify-center mt-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                      : `${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`
                  }`}
                >
                  Previous
                </button>
                
                <span className={`px-3 py-1 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                      : `${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`
                  }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HotelBookings() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel bookings...</p>
        </div>
      </div>
    }>
      <HotelBookingsContent />
    </Suspense>
  );
}
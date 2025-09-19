'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { format, differenceInDays } from 'date-fns';
import FlightVerification from '@/components/FlightVerification';
import CartDropdown from '@/components/CartDropdown';
import { 
  FaPlane, FaHotel, FaReceipt, FaCheckCircle, FaTimesCircle, FaCalendarAlt,
  FaMapMarkerAlt, FaArrowLeft, FaSpinner, FaCreditCard, FaFilePdf,
  FaExclamationTriangle, FaUser, FaInfoCircle, FaEnvelope, FaClipboardCheck,
  FaMoon, FaSun, FaSignOutAlt, FaBell
} from 'react-icons/fa';

function BookingDetailContent() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const { user, authFetch, logout } = useAuth();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellationModal, setCancellationModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancellationError, setCancellationError] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [expandedVerification, setExpandedVerification] = useState(null);
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
  
  // Check if user wants to cancel based on URL parameter
  useEffect(() => {
    if (searchParams && searchParams.get('action') === 'cancel') {
      setCancellationModal(true);
    }
  }, [searchParams]);
  
  // Extract location from address string (just for display purposes)
  const extractLocationFromAddress = (address) => {
    if (!address) return 'N/A';
    
    // Simple parsing - assuming format might be like "123 Main St, City, Country"
    const parts = address.split(',');
    if (parts.length > 1) {
      return {
        street: parts[0].trim(),
        city: parts[1].trim(),
        country: parts[2]?.trim() || ''
      };
    }
    return {
      street: address,
      city: '',
      country: ''
    };
  };
  
  // Parse passengers JSON if needed
  const getPassengersCount = (passengers) => {
    if (!passengers) return 1;
    
    if (typeof passengers === 'object') {
      return Object.keys(passengers).length;
    }
    
    try {
      // If it's a JSON string
      const parsed = JSON.parse(passengers);
      return Object.keys(parsed).length;
    } catch {
      return 1;
    }
  };
  
  // Fetch booking details
  useEffect(() => {
    if (!user) {
      router.push(`/login?redirect=/bookings/${id}`);
      return;
    }
    
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`/api/bookings/${id}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        
        const data = await response.json();
        setBooking(data);
        
        // Set invoice URL if available
        if (data.invoice?.pdfUrl) {
          setInvoiceUrl(data.invoice.pdfUrl);
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError(err.message || 'Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingDetails();
  }, [id, user, router, authFetch]);
  
  // Handle booking cancellation
  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      setCancellationError(null);
      
      const response = await authFetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }
      
      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      setCancellationModal(false);
      
      // Clean up URL parameter
      router.replace(`/bookings/${id}`);
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setCancellationError(err.message || 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };
  
  // Generate invoice
  const handleGenerateInvoice = async () => {
    try {
      setGeneratingInvoice(true);
      
      const response = await authFetch(`/api/bookings/${id}/invoice`);
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }
      
      const data = await response.json();
      setInvoiceUrl(data.invoiceUrl);
      
      // Update booking object with invoice
      if (booking) {
        setBooking({
          ...booking,
          invoice: {
            ...booking.invoice,
            pdfUrl: data.invoiceUrl
          }
        });
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError(err.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
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
    const isDark = darkMode;
    
    switch (status.toLowerCase()) {
      case 'confirmed':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isDark 
            ? 'bg-green-900/30 text-green-400' 
            : 'bg-green-100 text-green-800'
          } transition-colors duration-300`}>
            <FaCheckCircle className="mr-1" /> Confirmed
          </span>
        );
      case 'cancelled':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isDark 
            ? 'bg-red-900/30 text-red-400' 
            : 'bg-red-100 text-red-800'
          } transition-colors duration-300`}>
            <FaTimesCircle className="mr-1" /> Cancelled
          </span>
        );
      case 'pending':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isDark 
            ? 'bg-yellow-900/30 text-yellow-400' 
            : 'bg-yellow-100 text-yellow-800'
          } transition-colors duration-300`}>
            <FaInfoCircle className="mr-1" /> Pending
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isDark 
            ? 'bg-gray-700 text-gray-300' 
            : 'bg-gray-100 text-gray-800'
          } transition-colors duration-300`}>
            {status}
          </span>
        );
    }
  };
  
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <button 
            onClick={handleGoBack}
            className={`inline-flex items-center ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            } transition-colors duration-300`}>
            <FaArrowLeft className="mr-2" /> Back
          </button>
        </div>
        
        {error && (
          <div className={`mb-8 px-4 py-3 rounded relative ${
            darkMode
            ? 'bg-red-900/30 border border-red-700 text-red-400'
            : 'bg-red-50 border border-red-200 text-red-700'
          } transition-colors duration-300`}>
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <FaSpinner className={`animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'} text-4xl transition-colors duration-300`} />
          </div>
        ) : (
          booking && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden transition-colors duration-300`}>
              {/* Booking Header */}
              <div className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b transition-colors duration-300`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                      Booking #{booking.id.substring(0, 8)}
                    </h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center transition-colors duration-300`}>
                      <FaCalendarAlt className="mr-1" />
                      Booked on {format(new Date(booking.createdAt), 'MMMM d, yyyy')} at {format(new Date(booking.createdAt), 'h:mm a')}
                    </p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center">
                    {getStatusBadge(booking.status)}
                    <span className={`ml-4 text-xl font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>
                      {formatPrice(booking.totalPrice)}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {booking.status.toLowerCase() === 'confirmed' && (
                    <button
                      onClick={() => setCancellationModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300"
                    >
                      <FaTimesCircle className="mr-2" />
                      Cancel Booking
                    </button>
                  )}
                  
                  {invoiceUrl ? (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300"
                    >
                      <FaFilePdf className="mr-2" />
                      View Invoice
                    </a>
                  ) : (
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={generatingInvoice}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 ${generatingInvoice ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      {generatingInvoice ? (
                        <>
                          <FaSpinner className="animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FaReceipt className="mr-2" />
                          Generate Invoice
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Email booking confirmation option */}
                  <button
                    className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                      darkMode
                      ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                  >
                    <FaEnvelope className="mr-2" />
                    Email Confirmation
                  </button>
                </div>
              </div>
              
              {/* Main content */}
              <div className="p-6">
                {/* User Information */}
                <div className="mb-8">
                  <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>
                    <FaUser className="inline-block mr-2" />
                    Customer Information
                  </h2>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 transition-colors duration-300`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>Name</h3>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                          {user.firstName} {user.lastName}
                        </p>
                      </div>
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>Email</h3>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                          {user.email}
                        </p>
                      </div>
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>Payment Method</h3>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center transition-colors duration-300`}>
                          <FaCreditCard className="mr-1" /> 
                          {booking.paymentCardType?.toUpperCase() || 'Card'} ending in {booking.paymentCardLast4}
                        </p>
                      </div>
                      <div>
                        <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>Booking Status</h3>
                        <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                          {getStatusBadge(booking.status)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Booking Details */}
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 transition-colors duration-300`}>
                  {/* Flight Bookings */}
                  {booking.flightBookings && booking.flightBookings.length > 0 && (
                    <div className="mb-8">
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center transition-colors duration-300`}>
                        <FaPlane className="inline-block mr-2" />
                        Flight {booking.flightBookings.length > 1 ? 'Bookings' : 'Booking'}
                      </h2>
                      
                      <div className="space-y-6">
                        {booking.flightBookings.map((flight) => (
                          <div 
                            key={flight.id} 
                            className={`${darkMode ? 'bg-gray-700' : 'bg-white'} border ${
                              darkMode ? 'border-gray-600' : 'border-gray-200'
                            } rounded-lg shadow-sm overflow-hidden transition-colors duration-300`}
                          >
                            <div className={`${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} p-4 border-b ${
                              darkMode ? 'border-gray-600' : 'border-gray-200'
                            } transition-colors duration-300`}>
                              <div className="flex justify-between items-center">
                                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                  {flight.departureAirportCode} → {flight.arrivalAirportCode}
                                </h3>
                                {flight.afsBookingReference && (
                                  <div className={`text-sm ${
                                    darkMode 
                                    ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                    : 'bg-white border-gray-200 text-gray-700'
                                  } px-2 py-1 rounded border transition-colors duration-300`}>
                                    Ref: {flight.afsBookingReference}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1 transition-colors duration-300`}>Departure</h4>
                                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                    {format(new Date(flight.departureTime), 'h:mm a')}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                    {format(new Date(flight.departureTime), 'EEEE, MMMM d, yyyy')}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1 transition-colors duration-300`}>
                                    {flight.departureAirportCode}
                                  </p>
                                </div>
                                
                                <div>
                                  <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1 transition-colors duration-300`}>Arrival</h4>
                                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                    {format(new Date(flight.arrivalTime), 'h:mm a')}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                    {format(new Date(flight.arrivalTime), 'EEEE, MMMM d, yyyy')}
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1 transition-colors duration-300`}>
                                    {flight.arrivalAirportCode}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`mt-4 pt-4 border-t ${
                                darkMode ? 'border-gray-600' : 'border-gray-200'
                              } flex flex-wrap justify-between items-center transition-colors duration-300`}>
                                <div>
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                    Passengers: <span className="font-medium">{getPassengersCount(flight.passengers)}</span>
                                  </p>
                                  {flight.afsTicketNumber && (
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                      Ticket: <span className="font-medium">{flight.afsTicketNumber}</span>
                                    </p>
                                  )}
                                </div>
                                
                                {booking.status.toLowerCase() === 'confirmed' && (
                                  <div className="mt-2 md:mt-0">
                                    <button
                                      onClick={() => {
                                        if (expandedVerification === flight.id) {
                                          setExpandedVerification(null);
                                        } else {
                                          setExpandedVerification(flight.id);
                                        }
                                      }}
                                      className={`inline-flex items-center px-3 py-1.5 text-sm font-medium text-white ${
                                        darkMode ? 'bg-blue-600' : 'bg-blue-600'
                                      } rounded hover:bg-blue-700 transition-colors duration-300`}
                                    >
                                      <FaClipboardCheck className="mr-1.5" />
                                      {expandedVerification === flight.id ? 'Hide Verification' : 'Verify Flight'}
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {/* Flight verification component - only show when expanded */}
                              {expandedVerification === flight.id && (
                                <div className={`mt-4 pt-2 ${darkMode ? 'bg-gray-700' : 'bg-white'} transition-colors duration-300`}>
                                  <FlightVerification 
                                    flightBookingId={flight.id} 
                                    authFetch={authFetch}
                                    darkMode={darkMode}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Hotel Bookings */}
                  {booking.hotelBookings && booking.hotelBookings.length > 0 && (
                    <div className="mb-8">
                      <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center transition-colors duration-300`}>
                        <FaHotel className="inline-block mr-2" />
                        Hotel {booking.hotelBookings.length > 1 ? 'Bookings' : 'Booking'}
                      </h2>
                      
                      <div className="space-y-6">
                        {booking.hotelBookings.map((hotel) => {
                          const addressParts = extractLocationFromAddress(hotel.hotel?.address);
                          
                          return (
                            <div 
                              key={hotel.id} 
                              className={`${darkMode ? 'bg-gray-700' : 'bg-white'} border ${
                                darkMode ? 'border-gray-600' : 'border-gray-200'
                              } rounded-lg shadow-sm overflow-hidden transition-colors duration-300`}
                            >
                              <div className={`${darkMode ? 'bg-green-900/20' : 'bg-green-50'} p-4 border-b ${
                                darkMode ? 'border-gray-600' : 'border-gray-200'
                              } transition-colors duration-300`}>
                                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                  {hotel.hotel?.name || 'Hotel Booking'}
                                </h3>
                                {hotel.hotel?.address && (
                                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} flex items-center mt-1 transition-colors duration-300`}>
                                    <FaMapMarkerAlt className="mr-1 flex-shrink-0" />
                                    {addressParts.street ? `${addressParts.street}, ` : ''}
                                    {addressParts.city ? `${addressParts.city}, ` : ''}
                                    {addressParts.country || ''}
                                  </p>
                                )}
                              </div>
                              
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                    <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1 transition-colors duration-300`}>Check-in</h4>
                                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                      {format(new Date(hotel.checkInDate), 'EEEE, MMMM d, yyyy')}
                                    </p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                      After 3:00 PM
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-1 transition-colors duration-300`}>Check-out</h4>
                                    <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                      {format(new Date(hotel.checkOutDate), 'EEEE, MMMM d, yyyy')}
                                    </p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                      Before 11:00 AM
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="mt-4">
                                  <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2 transition-colors duration-300`}>Room Details</h4>
                                  <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded p-3 transition-colors duration-300`}>
                                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                      {hotel.roomType?.name || 'Standard Room'}
                                    </p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mt-1 transition-colors duration-300`}>
                                      {hotel.numberOfRooms} room(s) &bull; {differenceInDays(new Date(hotel.checkOutDate), new Date(hotel.checkInDate))} night(s)
                                    </p>
                                  </div>
                                </div>
                                
                                <div className={`mt-4 pt-4 border-t ${
                                  darkMode ? 'border-gray-600' : 'border-gray-200'
                                } flex justify-between items-center transition-colors duration-300`}>
                                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                                    Status: {getStatusBadge(hotel.status || booking.status)}
                                  </div>
                                  
                                  {booking.status.toLowerCase() === 'confirmed' && (
                                    <div>
                                      <button
                                        className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors duration-300`}
                                        onClick={() => window.alert('Hotel contact information coming soon!')}
                                      >
                                        Contact Hotel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Summary */}
                  <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 mt-6 transition-colors duration-300`}>
                    <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>
                      <FaReceipt className="inline-block mr-2" />
                      Payment Summary
                    </h2>
                    
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 transition-colors duration-300`}>
                      <div className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'} transition-colors duration-300`}>
                        {booking.hotelBookings && booking.hotelBookings.map((hotel) => (
                          <div key={`hotel-${hotel.id}`} className="py-3 flex justify-between">
                            <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                              <span className="font-medium">{hotel.hotel?.name}</span>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                                {hotel.roomType?.name} &bull; {hotel.numberOfRooms} room(s) &bull; {differenceInDays(new Date(hotel.checkOutDate), new Date(hotel.checkInDate))} night(s)
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                              {formatPrice(hotel.totalPrice || 0)}
                            </span>
                          </div>
                        ))}
                        
                        {/* Try to calculate or estimate flight prices since the schema doesn't have totalPrice for FlightBooking */}
                        {booking.flightBookings && booking.flightBookings.map((flight, index) => {
                          // Estimate flight price by dividing total by number of flights if we don't have individual prices
                          const flightPrice = booking.totalPrice / booking.flightBookings.length;
                          
                          return (
                            <div key={`flight-${flight.id}`} className="py-3 flex justify-between">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                <span className="font-medium">Flight: {flight.departureAirportCode} → {flight.arrivalAirportCode}</span>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                                  {format(new Date(flight.departureTime), 'MMM d, yyyy')} &bull; {getPassengersCount(flight.passengers)} passenger(s)
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
                                {formatPrice(flightPrice)}
                              </span>
                            </div>
                          );
                        })}
                        
                        <div className="py-3 flex justify-between">
                          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Total</span>
                          <span className={`text-base font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>
                            {formatPrice(booking.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>
                      Paid with {booking.paymentCardType?.toUpperCase() || 'Card'} ending in {booking.paymentCardLast4}
                    </p>
                  </div>
                  
                  {/* Cancellation Policy */}
                  {booking.status.toLowerCase() === 'confirmed' && (
                    <div className={`mt-8 p-4 ${
                      darkMode ? 'bg-yellow-900/30 border-yellow-800 text-yellow-400' : 'bg-yellow-50 border-yellow-100 text-yellow-800'
                    } border rounded-lg transition-colors duration-300`}>
                      <h3 className="text-sm font-medium flex items-center">
                        <FaExclamationTriangle className="mr-2" />
                        Cancellation Policy
                      </h3>
                      <p className={`mt-1 text-sm ${
                        darkMode ? 'text-yellow-300' : 'text-yellow-700'
                      } transition-colors duration-300`}>
                        Hotel bookings can be cancelled up to 24 hours before check-in for a full refund.
                        Flight cancellations may be subject to fees charged by the airline.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        
        {/* Cancellation Modal */}
        {cancellationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full p-6 transition-colors duration-300`}>
              <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center transition-colors duration-300`}>
                <FaExclamationTriangle className="text-red-500 mr-2" />
                Cancel Booking
              </h2>
              
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 transition-colors duration-300`}>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
              
              {cancellationError && (
                <div className={`mb-4 p-2 ${
                  darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
                } rounded text-sm transition-colors duration-300`}>
                  {cancellationError}
                </div>
              )}
              
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setCancellationModal(false);
                    router.replace(`/bookings/${id}`);
                  }}
                  className={`px-4 py-2 border rounded-md text-sm font-medium ${
                    darkMode
                    ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                >
                  No, Keep Booking
                </button>
                
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300 ${cancelling ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {cancelling ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-1" />
                      Cancelling...
                    </>
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

export default function BookingDetailPage() {
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
          } transition-colors duration-300`}>Loading booking details...</p>
        </div>
      </div>
    }>
      <BookingDetailContent />
    </Suspense>
  );
}
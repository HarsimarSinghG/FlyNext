'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { FaArrowRight, FaPlane, FaClock, FaSuitcase, FaUtensils, FaWifi, FaPlug, FaRegCalendarAlt, 
  FaMapMarkerAlt, FaExclamationTriangle, FaSpinner, FaRedo, FaArrowLeft, FaMoon, FaSun, 
  FaSignOutAlt, FaUser, FaShoppingCart } from 'react-icons/fa';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Toast from '@/components/Toast';
import CartDropdown from '@/components/CartDropdown';

export default function FlightDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addFlightBooking } = useCart();
  const { user, logout } = useAuth();
  
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passengers, setPassengers] = useState(parseInt(searchParams.get('passengers') || '1', 10));
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Refs for user menu
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  
  // Extract query params
  const tripType = searchParams.get('tripType') || 'one-way';
  const departureDate = searchParams.get('departureDate');
  const returnDate = searchParams.get('returnDate');
  const isReturn = searchParams.get('isReturn') === 'true';
  
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
  
  // Handle click outside user menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target) && 
        userButtonRef.current && 
        !userButtonRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef, userButtonRef]);
  
  // Helper function to safely parse ISO date strings
  const safeParseISO = (dateString) => {
    if (!dateString) return new Date();
    try {
      return parseISO(dateString);
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date();
    }
  };
  
  // Helper function to safely format dates
  const safeFormatDate = (dateString, formatStr) => {
    if (!dateString) return '';
    try {
      const date = typeof dateString === 'string' ? safeParseISO(dateString) : dateString;
      return format(date, formatStr);
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };
  
  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  // Calculate duration between two date strings
  const calculateDuration = (departureTime, arrivalTime) => {
    if (!departureTime || !arrivalTime) return 0;
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    return Math.round((arrival - departure) / (1000 * 60)); // minutes
  };

  // Function to fetch flight details
  const fetchFlightDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching flight details for ID: ${id}`);
      
      const response = await fetch(`/api/flights/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: Failed to fetch flight details`);
      }
      
      const data = await response.json();
      console.log('Flight data received:', data);
      setFlight(data);
    } catch (error) {
      console.error('Error fetching flight details:', error);
      setError(error.message || 'An unexpected error occurred while fetching flight information');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (id) {
      fetchFlightDetails();
    }
  }, [id]);
  
  // Add flight to cart
  const handleAddToCart = () => {
    if (!flight) return;
    
    // Handle both object and string format for origin/destination
    const originCode = typeof flight.origin === 'object' ? flight.origin.code : flight.origin;
    const destinationCode = typeof flight.destination === 'object' ? flight.destination.code : flight.destination;
    
    // Handle airline information
    const airlineName = typeof flight.airline === 'object' ? flight.airline.name : flight.airline;
    
    const flightData = {
      tripType,
      itineraryId: flight.itineraryId || flight.id,
      origin: originCode,
      destination: destinationCode,
      departureDate,
      returnDate,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.totalDuration || flight.duration,
      totalPrice: flight.totalPrice || flight.price,
      currency: flight.currency,
      passengers,
      airline: airlineName,
      flightNumber: flight.flightNumber,
      flights: flight.flights ? flight.flights.map(f => ({
        ...f,
        origin: typeof f.origin === 'object' ? f.origin.code : f.origin,
        destination: typeof f.destination === 'object' ? f.destination.code : f.destination,
        airline: typeof f.airline === 'object' ? f.airline.name : f.airline
      })) : null,
      layovers: flight.layovers ? flight.layovers.map(l => ({
        ...l,
        airport: typeof l.airport === 'object' ? l.airport.code : l.airport
      })) : [],
      isReturn
    };
    
    addFlightBooking(flightData);
    
    // Show success toast
    setToastMessage('Flight added to cart!');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  const handleBookNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };
  
  // Generate a breadcrumb for the flight
  const getBreadcrumb = () => {
    if (!flight) return (
      <div className={`text-sm breadcrumbs mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
        <ul className="flex items-center space-x-2">
          <li>
            <Link href="/flights" className={`hover:${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Flights</Link>
          </li>
          <li className="flex items-center">
            <span className="mx-2">›</span>
            <span>Flight Details</span>
          </li>
        </ul>
      </div>
    );
    
    const originCode = typeof flight.origin === 'object' ? flight.origin.code : flight.origin;
    const destCode = typeof flight.destination === 'object' ? flight.destination.code : flight.destination;
    
    return (
      <div className={`text-sm breadcrumbs mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
        <ul className="flex items-center space-x-2">
          <li>
            <Link href="/flights" className={`hover:${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Flights</Link>
          </li>
          <li className="flex items-center">
            <span className="mx-2">›</span>
            <span>{originCode} - {destCode}</span>
          </li>
          <li className="flex items-center">
            <span className="mx-2">›</span>
            <span>
              {isReturn ? 'Return' : 'Outbound'} Flight
            </span>
          </li>
        </ul>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header with Navigation */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="flex-shrink-0 flex items-center">
                <FaPlane className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`ml-2 text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>TravelEase</span>
              </Link>
              <nav className="hidden md:ml-6 md:flex space-x-4">
                <Link 
                  href="/flights" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${darkMode 
                    ? 'text-white bg-gray-700' 
                    : 'text-gray-900 bg-gray-100'} hover:opacity-80`}
                >
                  Flights
                </Link>
                <Link 
                  href="/hotels" 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  Hotels
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${darkMode 
                  ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors duration-200`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              
              {/* Shopping Cart */}
              <div className="relative">
                <CartDropdown />
              </div>
              
              {/* User Menu */}
              {user ? (
                <div className="relative">
                  <button
                    ref={userButtonRef}
                    className={`flex items-center space-x-2 p-2 rounded-full ${darkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-100'} transition-colors duration-200`}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  >
                    <FaUser className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                    <span className={`hidden md:inline-block text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                      {user.displayName || user.email || 'My Account'}
                    </span>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div 
                      ref={userMenuRef}
                      className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-10 ${darkMode 
                        ? 'bg-gray-800 ring-1 ring-black ring-opacity-5' 
                        : 'bg-white ring-1 ring-black ring-opacity-5'}`}
                    >
                      <Link 
                        href="/profile" 
                        className={`block px-4 py-2 text-sm ${darkMode 
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        Your Profile
                      </Link>
                      <Link 
                        href="/bookings" 
                        className={`block px-4 py-2 text-sm ${darkMode 
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        Your Bookings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className={`block w-full text-left px-4 py-2 text-sm ${darkMode 
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  href="/login" 
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${darkMode 
                    ? 'text-white bg-blue-600 hover:bg-blue-700' 
                    : 'text-white bg-blue-600 hover:bg-blue-700'}`}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <div className="mb-6 flex flex-wrap gap-2">

          <Link 
            href="/"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaPlane className="mr-2" />
            New Search
          </Link>
        </div>

        {getBreadcrumb()}
        
        {/* Render error state */}
        {error && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-8 text-center`}>
            <FaExclamationTriangle className={`mx-auto h-16 w-16 ${darkMode ? 'text-yellow-500' : 'text-yellow-400'} mb-6`} />
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Could Not Load Flight Details</h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{error}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fetchFlightDetails()}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700`}
              >
                <FaRedo className="mr-2" /> Retry
              </button>
              <Link 
                href="/flights"
                className={`inline-flex items-center px-4 py-2 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} rounded-md hover:opacity-90`}
              >
                Back to Flight Search
              </Link>
            </div>
          </div>
        )}
        
        {/* Render loading state */}
        {loading && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-8 text-center`}>
            <FaSpinner className={`mx-auto h-12 w-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin mb-6`} />
            <h1 className={`text-xl font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Loading Flight Details...</h1>
          </div>
        )}
        
        {/* Flight Details */}
        {!loading && !error && flight && (
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-md overflow-hidden mb-6 border`}>
            {/* Flight Summary */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                {isReturn ? 'Return Flight' : 'Outbound Flight'}: {typeof flight.origin === 'object' 
                  ? `${flight.origin.city || 'Unknown'} (${flight.origin.code})` 
                  : flight.origin} to {typeof flight.destination === 'object'
                    ? `${flight.destination.city || 'Unknown'} (${flight.destination.code})`
                    : flight.destination}
              </h1>
              
              <div className={`flex flex-wrap items-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} gap-y-2`}>
                <div className="flex items-center mr-6">
                  <FaRegCalendarAlt className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} />
                  <span>{departureDate ? safeFormatDate(departureDate, 'EEEE, MMMM d, yyyy') : safeFormatDate(flight.departureTime, 'EEEE, MMMM d, yyyy')}</span>
                </div>
                
                <div className="flex items-center mr-6">
                  <FaClock className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} />
                  <span>{formatDuration(flight.totalDuration || flight.duration)}</span>
                </div>
                
                <div className="flex items-center">
                  <FaPlane className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} />
                  <span>{!flight.layovers || flight.layovers.length === 0 
                    ? 'Direct Flight' 
                    : `${flight.layovers.length} ${flight.layovers.length === 1 ? 'Stop' : 'Stops'}`}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Flight Path */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {safeFormatDate(flight.departureTime, 'h:mm a')}
                  </span>
                  <div className="flex items-center mt-1">
                    <FaMapMarkerAlt className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {typeof flight.origin === 'object' 
                        ? `${flight.origin.city || 'Unknown'} (${flight.origin.code})` 
                        : flight.origin}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 mx-8">
                  <div className="relative px-8">
                    <div className={`h-0.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} absolute top-1/2 w-full`}></div>
                    <div className="flex justify-between relative">
                      <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-600'} -ml-1`}></div>
                      {!(!flight.layovers || flight.layovers.length === 0) && flight.layovers.map((layover, index) => (
                        <div key={index} className={`w-2 h-2 rounded-full ${darkMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                      ))}
                      <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-600'} -mr-1`}></div>
                    </div>
                  </div>
                  <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                    {formatDuration(flight.totalDuration || flight.duration)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {safeFormatDate(flight.arrivalTime, 'h:mm a')}
                  </span>
                  <div className="flex items-center mt-1">
                    <FaMapMarkerAlt className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-1`} />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {typeof flight.destination === 'object'
                        ? `${flight.destination.city || 'Unknown'} (${flight.destination.code})`
                        : flight.destination}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Layovers */}
              {!(!flight.layovers || flight.layovers.length === 0) && flight.layovers && flight.layovers.length > 0 && (
                <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 mb-6`}>
                  <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Layovers</h2>
                  
                  <div className="space-y-4">
                    {flight.layovers.map((layover, index) => {
                      const airportDisplay = typeof layover.airport === 'object'
                        ? `${layover.airport.city || 'Layover'} (${layover.airport.code})`
                        : layover.airport;
                        
                      return (
                        <div key={index} className={`pl-6 border-l-2 ${darkMode ? 'border-blue-800' : 'border-blue-200'}`}>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 ${darkMode ? 'bg-blue-900 border-blue-600' : 'bg-blue-100 border-blue-500'} border-2 rounded-full -ml-7.5 relative left-[-7px]`}></div>
                            <div className="ml-4">
                              <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{airportDisplay}</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatDuration(layover.duration)} layover
                              </p>
                              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Arrive: {safeFormatDate(layover.arrivalTime, 'h:mm a')} • 
                                Depart: {safeFormatDate(layover.departureTime, 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Flight Segments */}
              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 mb-6`}>
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Flight Details</h2>
                
                <div className="space-y-6">
                  {(flight.flights && flight.flights.length > 0) ? (
                    flight.flights.map((segment, index) => {
                      // Process segment data
                      const segmentOrigin = typeof segment.origin === 'object' 
                        ? segment.origin.code 
                        : segment.origin;
                      
                      const segmentDestination = typeof segment.destination === 'object'
                        ? segment.destination.code
                        : segment.destination;
                        
                      const segmentAirline = typeof segment.airline === 'object'
                        ? segment.airline.name
                        : segment.airline;
                      
                      return (
                        <div key={index} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md p-4`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`w-12 h-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md flex items-center justify-center mr-3`}>
                                <FaPlane className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} h-6 w-6`} />
                              </div>
                              <div>
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{segmentAirline}</p>
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Flight {segment.flightNumber || '-'}</p>
                              </div>
                            </div>
                            
                            <div>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{segment.aircraft || 'Commercial Aircraft'}</p>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{segment.class || 'Economy'} Class</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center mb-4">
                            <div className="flex flex-col">
                              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {safeFormatDate(segment.departureTime, 'h:mm a')}
                              </span>
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {safeFormatDate(segment.departureTime, 'MMM d, yyyy')}
                              </span>
                            </div>
                            
                            <div className="flex-1 mx-4">
                              <div className="relative">
                                <div className={`h-0.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} absolute top-1/2 w-full`}></div>
                              </div>
                              <div className={`flex justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} px-2`}>
                                <span>{segmentOrigin}</span>
                                <span>{formatDuration(segment.duration || calculateDuration(segment.departureTime, segment.arrivalTime))}</span>
                                <span>{segmentDestination}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {safeFormatDate(segment.arrivalTime, 'h:mm a')}
                              </span>
                              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {safeFormatDate(segment.arrivalTime, 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center">
                              <FaSuitcase className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                              <span className={darkMode ? 'text-gray-300' : ''}>{segment.baggage || flight.baggage || 'Checked baggage included'}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <FaUtensils className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                              <span className={darkMode ? 'text-gray-300' : ''}>{segment.meal || flight.meal ? 'Meal included' : 'Food available for purchase'}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <FaWifi className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                              <span className={darkMode ? 'text-gray-300' : ''}>{segment.wifi || flight.wifi ? 'WiFi available' : 'No WiFi'}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <FaPlug className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                              <span className={darkMode ? 'text-gray-300' : ''}>{segment.power || flight.power ? 'Power outlets' : 'No power outlets'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Singular flight case (not an itinerary with segments)
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-md p-4`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md flex items-center justify-center mr-3`}>
                            <FaPlane className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} h-6 w-6`} />
                          </div>
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {typeof flight.airline === 'object' ? flight.airline.name : flight.airline}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Flight {flight.flightNumber || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{flight.aircraft || 'Commercial Aircraft'}</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{flight.class || 'Economy'} Class</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-4">
                        <div className="flex flex-col">
                          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {safeFormatDate(flight.departureTime, 'h:mm a')}
                          </span>
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {safeFormatDate(flight.departureTime, 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <div className="flex-1 mx-4">
                          <div className="relative">
                            <div className={`h-0.5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'} absolute top-1/2 w-full`}></div>
                          </div>
                          <div className={`flex justify-between text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} px-2`}>
                            <span>{typeof flight.origin === 'object' ? flight.origin.code : flight.origin}</span>
                            <span>{formatDuration(flight.duration)}</span>
                            <span>{typeof flight.destination === 'object' ? flight.destination.code : flight.destination}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {safeFormatDate(flight.arrivalTime, 'h:mm a')}
                          </span>
                          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {safeFormatDate(flight.arrivalTime, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <FaSuitcase className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                          <span className={darkMode ? 'text-gray-300' : ''}>{flight.baggage || 'Checked baggage included'}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FaUtensils className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                          <span className={darkMode ? 'text-gray-300' : ''}>{flight.meal ? 'Meal included' : 'Food available for purchase'}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FaWifi className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                          <span className={darkMode ? 'text-gray-300' : ''}>{flight.wifi ? 'WiFi available' : 'No WiFi'}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FaPlug className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} mr-2`} />
                          <span className={darkMode ? 'text-gray-300' : ''}>{flight.power ? 'Power outlets' : 'No power outlets'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Booking Controls and Price */}
              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6`}>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                  <div>
                    <div className="mb-4">
                      <label htmlFor="passengers" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                        Passengers
                      </label>
                      <select
                        id="passengers"
                        className={`w-32 py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-700'
                        }`}
                        value={passengers}
                        onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
                      >
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num} className={darkMode ? 'bg-gray-700' : ''}>
                            {num} {num === 1 ? 'Passenger' : 'Passengers'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className={`mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span>Base fare:</span> ${(flight.totalPrice || flight.price).toFixed(2)} {flight.currency || 'USD'}
                    </p>
                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total:</span> 
                      ${((flight.totalPrice || flight.price) * passengers).toFixed(2)} {flight.currency || 'USD'}
                    </p>
                  </div>
                  
                  <div className="mt-6 md:mt-0 flex flex-col md:items-center">
                    <div className="inline-flex rounded-md">
                      <div className="flex space-x-3">
                        <button
                          onClick={handleAddToCart}
                          className={`inline-flex items-center justify-center px-6 py-3 border font-medium rounded-md ${
                            darkMode 
                              ? 'border-blue-500 text-blue-400 hover:bg-gray-700' 
                              : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={handleBookNow}
                          className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-white font-medium rounded-md bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                    <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                      Cancel for free within 24 hours of booking
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Back to Search Results */}
        <div className="text-center mb-8">
          <Link 
            href="/flights"
            className={`inline-flex items-center ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:underline'}`}
          >
            ← Back to Flight Search Results
          </Link>
        </div>
      </div>
      
      {/* Toast notification */}
      {showToast && (
        <Toast message={toastMessage} type={toastType} duration={3000} />
      )}
    </div>
  );
}
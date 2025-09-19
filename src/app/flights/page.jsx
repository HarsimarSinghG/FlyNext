'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Add the missing date-fns imports
import { format, addDays, parseISO, differenceInMinutes } from 'date-fns';
import { FaExchangeAlt, FaPlaneDeparture, FaPlaneArrival, FaCalendarAlt, FaSpinner, FaUser, FaClock, FaExclamationTriangle, FaChevronDown, FaChevronUp, FaBug, FaSignOutAlt, FaArrowLeft, FaMoon, FaSun } from 'react-icons/fa';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Toast from '@/components/Toast';
import Link from 'next/link';
import FlightCard from '@/components/FlightCard';
import CartDropdown from '@/components/CartDropdown';
import Image from 'next/image';

// Content component that uses useSearchParams
function FlightSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addFlightBooking } = useCart();
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  const [darkMode, setDarkMode] = useState(false);

  // Parse search params
  const originParam = searchParams.get('origin');
  const destinationParam = searchParams.get('destination');
  const departureDateParam = searchParams.get('departureDate');
  const returnDateParam = searchParams.get('returnDate');
  const tripTypeParam = searchParams.get('tripType') || 'round-trip';

  // Helper function to safely parse ISO date strings
  const safeParseISO = (dateString) => {
    if (!dateString) return new Date(); // Return current date as fallback
    try {
      return parseISO(dateString);
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date(); // Return current date if parsing fails
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

  // Form state
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureDate, setDepartureDate] = useState(
    departureDateParam || format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [returnDate, setReturnDate] = useState(
    returnDateParam || format(addDays(new Date(), 14), 'yyyy-MM-dd')
  );
  const [tripType, setTripType] = useState(tripTypeParam);
  const [passengers, setPassengers] = useState(1);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Debug state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [rawApiResponse, setRawApiResponse] = useState(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

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

  // Handle click outside user menu
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  // Retrieve location objects from sessionStorage
  useEffect(() => {
    const storedOrigin = sessionStorage.getItem('originLocation');
    const storedDestination = sessionStorage.getItem('destinationLocation');
    
    if (storedOrigin) {
      try {
        const parsedOrigin = JSON.parse(storedOrigin);
        setOrigin(parsedOrigin);
      } catch (error) {
        console.error('Error parsing stored origin:', error);
      }
    }
    
    if (storedDestination) {
      try {
        const parsedDestination = JSON.parse(storedDestination);
        setDestination(parsedDestination);
      } catch (error) {
        console.error('Error parsing stored destination:', error);
      }
    }
  }, []);

  // Run search from URL params or stored location objects
  useEffect(() => {
    if ((origin && destination && departureDate) || (originParam && destinationParam && departureDateParam)) {
      performSearch();
    }
  }, [origin, destination, departureDate, originParam, destinationParam, departureDateParam, returnDateParam]);

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();

    if (!origin || !destination || !departureDate) {
      setSearchError('Please fill all required fields');
      return;
    }

    // Store location objects in sessionStorage
    sessionStorage.setItem('originLocation', JSON.stringify(origin));
    sessionStorage.setItem('destinationLocation', JSON.stringify(destination));

    // Build search parameters for URL
    const params = new URLSearchParams();

    // Make sure to use strings, not objects
    params.append('origin', origin.type === 'airport' ? origin.code : origin.name);
    params.append('destination', destination.type === 'airport' ? destination.code : destination.name);
    params.append('departureDate', departureDate);
    params.append('tripType', tripType);

    if (tripType === 'round-trip') {
      params.append('returnDate', returnDate);
    }

    // Update URL to reflect search parameters
    router.push(`/flights?${params.toString()}`);
  };

  // Perform the flight search
  const performSearch = async () => {
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    setRawApiResponse(null);

    try {
      // Build search parameters for API
      const params = new URLSearchParams();
      
      // Use the location objects if available, otherwise use URL parameters
      const originCode = origin?.code || originParam;
      const destinationCode = destination?.code || destinationParam;
      
      params.append('origin', originCode);
      params.append('destination', destinationCode);
      params.append('departureDate', departureDate || departureDateParam);

      if ((tripType === 'round-trip' || tripTypeParam === 'round-trip') && (returnDate || returnDateParam)) {
        params.append('returnDate', returnDate || returnDateParam);
      }

      // Call the flight search API
      const response = await fetch(`/api/flights/search?${params.toString()}`);
      const data = await response.json();

      // Store the raw API response for debugging
      setRawApiResponse(data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search flights');
      }

      setSearchResults(data);
    } catch (error) {
      console.error('Flight search failed:', error);
      setSearchError(error.message || 'Failed to search flights');
    } finally {
      setIsSearching(false);
    }
  };

  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Add flight to cart
  const handleAddFlightToCart = (flight, isReturn = false) => {
    const flightData = {
      id: flight.id,
      tripType: searchResults.tripType,
      itineraryId: flight.itineraryId,
      // Make sure we're using strings, not objects
      origin: typeof flight.origin === 'object' ? flight.origin.code : flight.origin,
      destination: typeof flight.destination === 'object' ? flight.destination.code : flight.destination,
      departureDate: departureDateParam,
      returnDate: returnDateParam,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.totalDuration,
      totalPrice: flight.totalPrice,
      currency: flight.currency,
      passengers: passengers,
      flights: flight.flights?.map(f => ({
        ...f,
        // Make sure origin and destination are strings
        origin: typeof f.origin === 'object' ? f.origin.code : f.origin,
        destination: typeof f.destination === 'object' ? f.destination.code : f.destination
      })) || [],
      layovers: flight.layovers?.map(l => ({
        ...l,
        // Make sure airport is a string
        airport: typeof l.airport === 'object' ? l.airport.code : l.airport
      })) || [],
      isReturn
    };

    addFlightBooking(flightData);

    // Show success toast
    setToastMessage('Flight added to cart!');
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* All your existing JSX content */}
      {/* Navigation */}
      <nav className={`${darkMode ? 'bg-gray-800 shadow-gray-700/30' : 'bg-white shadow-md'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-blue-600 font-bold text-2xl">FlyNext</Link>
              </div>
              <div className="hidden md:flex md:space-x-8 md:ml-6">
                <Link href="/" className={`${darkMode ? 'text-gray-300 hover:text-white border-transparent' : 'text-gray-500 hover:text-gray-700 border-transparent'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300`}>
                  Home
                </Link>
                <Link href="/bookings" className={`${darkMode ? 'text-gray-300 hover:text-white border-transparent' : 'text-gray-500 hover:text-gray-700 border-transparent'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300`}>
                  My Bookings
                </Link>
                <Link href="/flights" className={`border-blue-500 text-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-300`}>
                  Flights
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <button
                onClick={toggleDarkMode}
                className={`mr-3 p-2 rounded-full ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              
              {user ? (
                <>
                  <CartDropdown />
                  <div className="ml-3 relative">
                    <div>
                      <button
                        ref={userButtonRef}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className={`flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 items-center gap-2 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'} px-4 py-2 transition-all`}
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
                    </div>
                    {isUserMenuOpen && (
                      <div 
                        ref={userMenuRef}
                        className={`origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Signed in as</p>
                          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'} truncate`}>{user.email}</p>
                        </div>
                        <Link href="/profile" className={`block px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-2`}>
                          <FaUser size={14} />
                          <span>Profile</span>
                        </Link>
                        <Link href="/bookings" className={`block px-4 py-2 text-sm ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} flex items-center gap-2`}>
                          <FaUser size={14} />
                          <span>My Bookings</span>
                        </Link>
                        <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}></div>
                        <button 
                          onClick={handleLogout}
                          className={`block w-full text-left px-4 py-2 text-sm text-red-600 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} flex items-center gap-2`}
                        >
                          <FaSignOutAlt size={14} />
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link href="/login" className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} font-medium`}>
                    Login
                  </Link>
                  <Link 
                    href="/signup" 
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-300"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/"
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'} transition-colors duration-300`}
          >
            <FaArrowLeft size={12} />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Debug Mode Toggle */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={`inline-flex items-center px-3 py-1.5 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} text-sm rounded-md transition-colors`}
          >
            <FaBug className="mr-1" />
            {showDebugPanel ? 'Hide Debug Data' : 'Show Debug Data'}
          </button>
        </div>

        {/* Debug Panel - API Response */}
        {showDebugPanel && rawApiResponse && (
          <div className="bg-gray-900 text-gray-200 p-4 rounded-md shadow-md mb-6 overflow-auto max-h-96">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-mono">API Response</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(rawApiResponse, null, 2));
                  setToastMessage('API response copied to clipboard!');
                  setToastType('info');
                  setShowToast(true);
                  setTimeout(() => setShowToast(false), 3000);
                }}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
              >
                Copy to Clipboard
              </button>
            </div>
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(rawApiResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Search Form */}
        <div className={`${darkMode ? 'bg-gray-800 shadow-gray-700/30' : 'bg-white shadow-md'} rounded-lg p-6 mb-8 transition-colors duration-300`}>
          <h1 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Find Your Perfect Flight</h1>

          <form onSubmit={handleSearchSubmit}>
            <div className="space-y-4">
              {/* Trip Type Selection */}
              <div className={`flex overflow-hidden rounded-md ${darkMode ? 'border-gray-700' : 'border border-gray-300'}`}>
                <button
                  type="button"
                  className={`flex-1 py-2 text-center ${
                    tripType === 'round-trip' 
                      ? 'bg-blue-600 text-white' 
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } transition-colors duration-300`}
                  onClick={() => setTripType('round-trip')}
                >
                  Round Trip
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-center ${
                    tripType === 'one-way' 
                      ? 'bg-blue-600 text-white' 
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100'
                  } transition-colors duration-300`}
                  onClick={() => setTripType('one-way')}
                >
                  One Way
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Origin */}
                <LocationAutocomplete 
                  id="origin"
                  label="From"
                  placeholder="City or Airport"
                  value={origin}
                  onChange={setOrigin}
                  darkMode={darkMode}
                />

                {/* Destination */}
                <div className="relative">
                  <LocationAutocomplete 
                    id="destination"
                    label="To"
                    placeholder="City or Airport"
                    value={destination}
                    onChange={setDestination}
                    darkMode={darkMode}
                  />

                  {/* Swap Origin/Destination Button */}
                  <button
                    type="button"
                    className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center z-10 ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        : 'bg-white border border-gray-300 hover:bg-gray-100'
                    } transition-colors duration-300`}
                    onClick={() => {
                      const temp = origin;
                      setOrigin(destination);
                      setDestination(temp);
                    }}
                  >
                    <FaExchangeAlt className={`${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Departure Date */}
                <div>
                  <label htmlFor="departureDate" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Departure Date
                  </label>
                  <div className="relative">
                    <input
                      id="departureDate"
                      type="date"
                      className={`block w-full pl-10 pr-3 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300 text-gray-700'
                      }`}
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    </div>
                  </div>
                </div>

                {/* Return Date (only for round trip) */}
                {tripType === 'round-trip' && (
                  <div>
                    <label htmlFor="returnDate" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Return Date
                    </label>
                    <div className="relative">
                      <input
                        id="returnDate"
                        type="date"
                        className={`block w-full pl-10 pr-3 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'border border-gray-300 text-gray-700'
                        }`}
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departureDate || format(new Date(), 'yyyy-MM-dd')}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaCalendarAlt className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Passengers */}
                <div>
                  <label htmlFor="passengers" className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Passengers
                  </label>
                  <div className="relative">
                    <select
                      id="passengers"
                      className={`block w-full pl-10 pr-3 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300 text-gray-700'
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
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Error */}
              {searchError && (
                <div className="text-red-500 text-sm">{searchError}</div>
              )}

              {/* Search Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center">
                      <FaSpinner className="animate-spin mr-2" />
                      Searching...
                    </span>
                  ) : (
                    'Search Flights'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Loading Indicator */}
        {isSearching && (
          <div className={`flex flex-col items-center justify-center py-12 ${darkMode ? 'text-white' : ''}`}>
            <FaSpinner className="animate-spin text-blue-600 h-12 w-12 mb-4" />
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Searching for the best flights...</p>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && searchResults && (
          <div className="space-y-8">
            {/* Outbound Flights */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 transition-colors duration-300`}>
              <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {searchResults.tripType === 'round-trip' ? 'Outbound Flights' : 'Available Flights'}
              </h2>
              <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {originParam} to {destinationParam} • {departureDateParam ? safeFormatDate(departureDateParam, 'EEEE, MMMM d, yyyy') : 'Select date'}
              </p>

              {searchResults.outbound.length === 0 ? (
                <div className="py-8 text-center">
                  <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No flights found</h3>
                  <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Try different dates or airports/cities
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchResults.outbound.map((flight) => (
                    <div key={flight.id || flight.itineraryId || Math.random()} className={`border rounded-md overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <FlightCard
                        flight={flight}
                        onAddToCart={handleAddFlightToCart}
                        tripType={tripType}
                        departureDate={departureDate}
                        returnDate={returnDate}
                        passengers={passengers}
                        isReturn={false}
                        safeFormatDate={safeFormatDate}
                        formatDuration={formatDuration}
                        darkMode={darkMode}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Return Flights (only for round-trip) */}
            {searchResults.tripType === 'round-trip' && searchResults.return && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 transition-colors duration-300`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Return Flights</h2>
                <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {destinationParam} to {originParam} • {returnDateParam ? safeFormatDate(returnDateParam, 'EEEE, MMMM d, yyyy') : 'Select date'}
                </p>

                {searchResults.return.length === 0 ? (
                  <div className="py-8 text-center">
                    <FaExclamationTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>No flights found</h3>
                    <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Try different dates or airports/cities
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.return.map((flight) => (
                      <div key={flight.id || flight.itineraryId || Math.random()} className={`border rounded-md overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <FlightCard
                          flight={flight}
                          onAddToCart={handleAddFlightToCart}
                          tripType={tripType}
                          departureDate={departureDate}
                          returnDate={returnDate}
                          passengers={passengers}
                          isReturn={true}
                          safeFormatDate={safeFormatDate}
                          formatDuration={formatDuration}
                          darkMode={darkMode}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {showToast && (
        <Toast message={toastMessage} type={toastType} duration={3000} />
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function FlightPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flight search...</p>
        </div>
      </div>
    }>
      <FlightSearchContent />
    </Suspense>
  );
}
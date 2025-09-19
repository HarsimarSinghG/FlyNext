'use client';
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaHotel, FaMapMarkerAlt, FaStar, FaSearch, FaMoon, FaSun, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import CartDropdown from '@/components/CartDropdown';

// Create a content component that uses the useSearchParams hook
function HotelsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  
  // State for search filters
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [name, setName] = useState(searchParams.get('name') || '');
  const [checkInDate, setCheckInDate] = useState(searchParams.get('checkInDate') || '');
  const [checkOutDate, setCheckOutDate] = useState(searchParams.get('checkOutDate') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');
  const [maxRating, setMaxRating] = useState(searchParams.get('maxRating') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  
  // State for dark mode
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // State for hotels data
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
  
  // Fetch hotels based on search params
  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build query string from all available filters
        const queryParams = new URLSearchParams();
        if (city) queryParams.append('city', city);
        if (name) queryParams.append('name', name);
        if (checkInDate) queryParams.append('checkInDate', checkInDate);
        if (checkOutDate) queryParams.append('checkOutDate', checkOutDate);
        if (minRating) queryParams.append('minRating', minRating);
        if (maxRating) queryParams.append('maxRating', maxRating);
        if (minPrice) queryParams.append('minPrice', minPrice);
        if (maxPrice) queryParams.append('maxPrice', maxPrice);
        
        const response = await fetch(`/api/hotels?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch hotels');
        }
        
        const data = await response.json();
        setHotels(data);
      } catch (error) {
        console.error('Error fetching hotels:', error);
        setError('Failed to load hotels. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch if we have filters set or on initial page load
    if (searchParams.toString() || document.readyState === 'complete') {
      fetchHotels();
    }
  }, [searchParams]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Build query params for the URL
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (name) params.append('name', name);
    if (checkInDate) params.append('checkInDate', checkInDate);
    if (checkOutDate) params.append('checkOutDate', checkOutDate);
    if (minRating) params.append('minRating', minRating);
    if (maxRating) params.append('maxRating', maxRating);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    // Navigate to the same page with updated query params
    router.push(`/hotels?${params.toString()}`);
  };
  
  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };
  
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
                {user ? (
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
                ) : (
                  <Link
                    href="/login"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                      darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    } transition-colors duration-300`}
                  >
                    <FaUser />
                    <span>Login</span>
                  </Link>
                )}
                
                {user && isUserMenuOpen && (
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
                      <FaCalendar size={14} />
                      <span>My Bookings</span>
                    </Link>
                    
                    <button 
                      onClick={handleLogout}
                      className={`block w-full text-left px-4 py-2 text-sm text-red-600 flex items-center gap-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors duration-300`}
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
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 transition-colors duration-300`}>Find Your Perfect Hotel</h1>
        
        {/* Search and Filter Form */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* City Search */}
              <div>
                <label htmlFor="city" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                  City
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaMapMarkerAlt className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`} />
                  </div>
                  <input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                    placeholder="Enter city"
                  />
                </div>
              </div>
              
              {/* Hotel Name */}
              <div>
                <label htmlFor="name" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                  Hotel Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaHotel className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`} />
                  </div>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                    placeholder="Hotel name"
                  />
                </div>
              </div>
              
              {/* Check-in Date */}
              <div>
                <label htmlFor="check-in" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                  Check-in Date
                </label>
                <input
                  type="date"
                  id="check-in"
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                    : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                  } transition-colors duration-300`}
                />
              </div>
              
              {/* Check-out Date */}
              <div>
                <label htmlFor="check-out" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                  Check-out Date
                </label>
                <input
                  type="date"
                  id="check-out"
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  min={checkInDate || new Date().toISOString().split('T')[0]}
                  className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                    : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                  } transition-colors duration-300`}
                />
              </div>
            </div>
            
            <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-6 transition-colors duration-300`}>
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>Filter Results</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Star Rating - Min */}
                <div>
                  <label htmlFor="min-rating" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Min Star Rating
                  </label>
                  <select
                    id="min-rating"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className={`block w-full pl-3 pr-10 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                  >
                    <option value="">Any</option>
                    <option value="1">1 Star</option>
                    <option value="2">2 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
                
                {/* Star Rating - Max */}
                <div>
                  <label htmlFor="max-rating" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Max Star Rating
                  </label>
                  <select
                    id="max-rating"
                    value={maxRating}
                    onChange={(e) => setMaxRating(e.target.value)}
                    className={`block w-full pl-3 pr-10 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                  >
                    <option value="">Any</option>
                    <option value="1">1 Star</option>
                    <option value="2">2 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="5">5 Stars</option>
                  </select>
                </div>
                
                {/* Price Range - Min */}
                <div>
                  <label htmlFor="min-price" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    id="min-price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    min="0"
                    step="10"
                    className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                    placeholder="Min $"
                  />
                </div>
                
                {/* Price Range - Max */}
                <div>
                  <label htmlFor="max-price" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    id="max-price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    min={minPrice || "0"}
                    step="10"
                    className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                    placeholder="Max $"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                type="submit"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FaSearch className="mr-2" />
                Search Hotels
              </button>
            </div>
          </form>
        </div>
        
        {/* Results Section */}
        <div className="space-y-6">
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>
            {loading ? 'Searching Hotels...' : 
             error ? 'Error' : 
             hotels.length > 0 ? `Found ${hotels.length} Hotels` : 'No Hotels Found'}
          </h2>
          
          {loading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {error && (
            <div className={`${
              darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            } border px-4 py-3 rounded-md transition-colors duration-300`}>
              {error}
            </div>
          )}
          
          {!loading && !error && hotels.length === 0 && (
            <div className={`${
              darkMode ? 'bg-yellow-900/20 border-yellow-700 text-yellow-400' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            } border px-4 py-3 rounded-md transition-colors duration-300`}>
              No hotels found matching your criteria. Try adjusting your filters.
            </div>
          )}
          
          {!loading && !error && hotels.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {hotels.map(hotel => (
                <div key={hotel.id} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300`}>
                  <div className="h-48 bg-gray-200 relative">
                    {hotel.logoUrl ? (
                      <img 
                        src={hotel.logoUrl} 
                        alt={`${hotel.name} logo`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} transition-colors duration-300`}>
                        <FaHotel size={48} className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-1">
                      <div className="flex items-center px-2">
                        {[...Array(hotel.starRating)].map((_, i) => (
                          <FaStar key={i} className="text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-300`}>{hotel.name}</h3>
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} flex items-center mb-3 transition-colors duration-300`}>
                      <FaMapMarkerAlt className="mr-1" />
                      {hotel.address}
                    </p>
                    
                    {hotel.startingPrice && (
                      <p className={`text-lg font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-4 transition-colors duration-300`}>
                        From ${hotel.startingPrice} / night
                      </p>
                    )}
                    
                    <Link 
                      href={`/hotels/${hotel.id}${checkInDate && checkOutDate ? `?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}` : ''}`}
                      className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main component that wraps the content with Suspense
export default function HotelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 transition-colors duration-300">Loading hotels...</p>
        </div>
      </div>
    }>
      <HotelsPageContent />
    </Suspense>
  );
}
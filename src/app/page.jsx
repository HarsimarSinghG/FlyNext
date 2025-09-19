'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FaPlane, FaHotel, FaUser, FaSearch, FaMapMarkerAlt, FaSuitcase, FaSignOutAlt, FaCog, FaBell, FaCalendarAlt, FaStar } from 'react-icons/fa';
import { useAuth } from '@/context/AuthContext';
import NotificationBadge from '@/components/NotificationBadge';
import CartDropdown from '@/components/CartDropdown';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import { format, addDays } from 'date-fns';

function LandingPageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('flights');
  const [tripType, setTripType] = useState('round-trip');
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureDate, setDepartureDate] = useState(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [returnDate, setReturnDate] = useState(
    format(addDays(new Date(), 14), 'yyyy-MM-dd')
  );
  const [passengers, setPassengers] = useState(1);

  const [city, setCity] = useState('');
  const [hotelName, setHotelName] = useState('');
  const [checkInDate, setCheckInDate] = useState(
    format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [checkOutDate, setCheckOutDate] = useState(
    format(addDays(new Date(), 14), 'yyyy-MM-dd')
  );
  const [minRating, setMinRating] = useState('');
  const [maxRating, setMaxRating] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

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
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleFlightSearch = () => {
    const params = new URLSearchParams();
    
    // Store the full origin object in sessionStorage
    if (origin) {
      params.append('origin', origin.type === 'airport' ? origin.code : origin.name);
      sessionStorage.setItem('originLocation', JSON.stringify(origin));
    }
    
    // Store the full destination object in sessionStorage
    if (destination) {
      params.append('destination', destination.type === 'airport' ? destination.code : destination.name);
      sessionStorage.setItem('destinationLocation', JSON.stringify(destination));
    }
    
    if (departureDate) params.append('departureDate', departureDate);
    if (tripType === 'round-trip' && returnDate) params.append('returnDate', returnDate);
    params.append('passengers', passengers);
    params.append('tripType', tripType);
    
    // Navigate to flights page with search parameters
    router.push(`/flights?${params.toString()}`);
  };

  const handleHotelSearch = () => {
    const params = new URLSearchParams();
    
    if (city) params.append('city', city);
    if (hotelName) params.append('name', hotelName);
    if (checkInDate) params.append('checkInDate', checkInDate);
    if (checkOutDate) params.append('checkOutDate', checkOutDate);
    if (minRating) params.append('minRating', minRating);
    if (maxRating) params.append('maxRating', maxRating);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    
    // Navigate to hotels page with search parameters
    router.push(`/hotels?${params.toString()}`);
  };

  const navigateToHotels = (cityName) => {
    const params = new URLSearchParams();
    params.append('city', cityName);
    if (checkInDate) params.append('checkInDate', checkInDate);
    if (checkOutDate) params.append('checkOutDate', checkOutDate);
    
    router.push(`/hotels?${params.toString()}`);
  };

  const featuredDestinations = [
    { id: 1, name: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34', price: '$499' },
    { id: 2, name: 'Bali', country: 'Indonesia', image: 'https://images.unsplash.com/photo-1560184611-5b5749138c3c', price: '$749' },
    { id: 3, name: 'New York', country: 'USA', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9', price: '$599' },
    { id: 4, name: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc', price: '$899' },
    { id: 5, name: 'Rome', country: 'Italy', image: 'https://images.unsplash.com/photo-1529260830199-42c24126f198', price: '$649' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-blue-600 font-bold text-2xl">FlyNext</span>
              </div>
              <div className="hidden md:flex md:space-x-8 md:ml-6">
                <Link href="/" className="border-blue-500 text-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Home
                </Link>
                <Link href="/bookings" className={`${pathname === '/bookings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                  My Bookings
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {user ? (
                <>
                  <CartDropdown />
                  <div className="ml-3 relative">
                    <div>
                      <button
                        ref={userButtonRef}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 items-center gap-2 bg-blue-50 px-4 py-2 text-blue-600 hover:bg-blue-100 transition-all"
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
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm">Signed in as</p>
                          <p className="text-sm font-medium text-gray-800 truncate">{user.email}</p>
                        </div>
                        <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                          <FaUser size={14} />
                          <span>Profile</span>
                        </Link>
                        <Link href="/bookings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                          <FaSuitcase size={14} />
                          <span>My Bookings</span>
                        </Link>
                        <Link href="/hotel-management" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                          <FaHotel size={14} />
                          <span>Manage Hotels</span>
                        </Link>
                        <Link href="/notifications" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                          <NotificationBadge />
                          <span>Notifications</span>
                        </Link>
                        <div className="border-t border-gray-100"></div>
                        <button 
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
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
                  <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
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
            <div className="flex items-center sm:hidden">
              <button 
                type="button" 
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - With sky background */}
      <div className="relative pb-32 overflow-hidden">
        {/* Sky background image */}
        <div className="absolute inset-0">
          <Image
            src="/images/sky-background.jpg"
            alt="Sky background"
            fill
            className="object-cover"
            priority
          />
          {/* Semi-transparent overlay for better text readability */}
          <div className="absolute inset-0 bg-black opacity-20"></div>
        </div>
        
        <div className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 lg:pt-40 lg:pb-48">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Your Next Adventure <br className="hidden sm:block" />
              Starts with FlyNext
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-white">
              Discover amazing destinations, find the best deals on flights and hotels, and create unforgettable memories.
            </p>
            
            <div className="mt-10">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
                <div className="flex border-b mb-4">
                  <button
                    className={`px-8 py-3 font-medium text-base flex items-center ${activeTab === 'flights' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('flights')}
                  >
                    <FaPlane className="mr-2" />
                    Flights
                  </button>
                  <button
                    className={`px-8 py-3 font-medium text-base flex items-center ${activeTab === 'hotels' ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('hotels')}
                  >
                    <FaHotel className="mr-2" />
                    Hotels
                  </button>
                </div>
                
                {activeTab === 'flights' && (
                  <div className="pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Trip Type Selection */}
                      <div className="flex border border-gray-300 rounded-md overflow-hidden md:col-span-2">
                        <button
                          type="button"
                          className={`flex-1 py-2 text-center ${
                            tripType === 'round-trip' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setTripType('round-trip')}
                        >
                          Round Trip
                        </button>
                        <button
                          type="button"
                          className={`flex-1 py-2 text-center ${
                            tripType === 'one-way' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setTripType('one-way')}
                        >
                          One Way
                        </button>
                      </div>
                      
                      {/* Origin */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                        <LocationAutocomplete 
                          id="origin"
                          placeholder="City or Airport"
                          value={origin}
                          onChange={setOrigin}
                        />
                      </div>
                      
                      {/* Destination */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                        <LocationAutocomplete 
                          id="destination"
                          placeholder="City or Airport"
                          value={destination}
                          onChange={setDestination}
                        />
                      </div>
                      
                      {/* Departure Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
                        <div className="relative">
                          <input
                            id="departureDate"
                            type="date"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Return Date (only for round trip) */}
                      {tripType === 'round-trip' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                          <div className="relative">
                            <input
                              id="returnDate"
                              type="date"
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                              value={returnDate}
                              onChange={(e) => setReturnDate(e.target.value)}
                              min={departureDate || format(new Date(), 'yyyy-MM-dd')}
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaCalendarAlt className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Passengers */}
                      <div className={tripType === 'one-way' ? 'md:col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
                        <div className="relative">
                          <select
                            id="passengers"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            value={passengers}
                            onChange={(e) => setPassengers(parseInt(e.target.value, 10))}
                          >
                            {[1, 2, 3, 4, 5, 6].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? 'Passenger' : 'Passengers'}</option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaUser className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-5 text-center">
                      <button 
                        onClick={handleFlightSearch}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FaSearch className="mr-2" />
                        Search Flights
                      </button>
                    </div>
                  </div>
                )}
                
                {activeTab === 'hotels' && (
                  <div className="pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* City Search */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaMapMarkerAlt className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter city"
                          />
                        </div>
                      </div>
                      
                      {/* Hotel Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaHotel className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={hotelName}
                            onChange={(e) => setHotelName(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Hotel name"
                          />
                        </div>
                      </div>
                      
                      {/* Check-in Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={checkInDate}
                            onChange={(e) => setCheckInDate(e.target.value)}
                            min={format(new Date(), 'yyyy-MM-dd')}
                            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      
                      {/* Check-out Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={checkOutDate}
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            min={checkInDate || format(new Date(), 'yyyy-MM-dd')}
                            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Filters (collapsed by default) */}
                    <details className="mt-4 mb-4">
                      <summary className="text-sm font-medium text-blue-600 cursor-pointer">
                        More Filters
                      </summary>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Min Star Rating */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Star Rating
                          </label>
                          <select
                            value={minRating}
                            onChange={(e) => setMinRating(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Any</option>
                            <option value="1">1 Star</option>
                            <option value="2">2 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="5">5 Stars</option>
                          </select>
                        </div>
                        
                        {/* Max Star Rating */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Star Rating
                          </label>
                          <select
                            value={maxRating}
                            onChange={(e) => setMaxRating(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Any</option>
                            <option value="1">1 Star</option>
                            <option value="2">2 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="5">5 Stars</option>
                          </select>
                        </div>
                        
                        {/* Min Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Price ($)
                          </label>
                          <input
                            type="number"
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            min="0"
                            step="10"
                            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Min $"
                          />
                        </div>
                        
                        {/* Max Price */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Price ($)
                          </label>
                          <input
                            type="number"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            min={minPrice || "0"}
                            step="10"
                            className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Max $"
                          />
                        </div>
                      </div>
                    </details>
                    
                    <div className="mt-5 text-center">
                      <button 
                        onClick={handleHotelSearch}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FaSearch className="mr-2" />
                        Search Hotels
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Destinations - Modified to link directly to hotel search */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Featured Destinations
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Explore our handpicked destinations with exclusive deals and discounts.
            </p>
          </div>

          <div className="mt-12 grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {featuredDestinations.map((destination) => (
              <div 
                key={destination.id} 
                className="group relative rounded-lg overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => navigateToHotels(destination.name)}
              >
                <div className="h-48 w-full relative overflow-hidden">
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900">{destination.name}</h3>
                  <p className="text-sm text-gray-500">{destination.country}</p>
                  <div className="mt-4">
                    <span className="text-blue-600 font-bold">From {destination.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features/Services Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose FlyNext
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              We provide the best travel experience with our top-notch services.
            </p>
          </div>

          <div className="mt-12 grid gap-8 grid-cols-1 md:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Best Price Guarantee</h3>
              <p className="mt-2 text-base text-gray-500">
                Find a lower price? We'll match it and give you an additional discount.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Verified Reviews</h3>
              <p className="mt-2 text-base text-gray-500">
                Real reviews from real travelers to help you make the right choice.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="h-12 w-12 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">24/7 Support</h3>
              <p className="mt-2 text-base text-gray-500">
                Our customer support team is available around the clock to assist you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:py-16 lg:px-8">
          <div className="rounded-lg bg-blue-700 px-6 py-6 md:py-12 md:px-12 lg:py-16 lg:px-16 xl:flex xl:items-center">
            <div className="xl:w-0 xl:flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Get travel deals and updates
              </h2>
              <p className="mt-3 max-w-3xl text-lg leading-6 text-blue-200">
                Sign up for our newsletter to receive special offers and the latest travel inspiration.
              </p>
            </div>
            <div className="mt-8 sm:w-full sm:max-w-md xl:mt-0 xl:ml-8">
              <form className="sm:flex">
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-md border-white px-5 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
                  placeholder="Enter your email"
                />
                <button
                  type="submit"
                  className="mt-3 flex w-full items-center justify-center rounded-md border border-transparent bg-blue-900 px-5 py-3 text-base font-medium text-white shadow hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700 sm:mt-0 sm:ml-3 sm:w-auto sm:flex-shrink-0"
                >
                  Subscribe
                </button>
              </form>
              <p className="mt-3 text-sm text-blue-200">
                We care about your data. Read our{' '}
                <a href="#" className="font-medium text-white underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800" aria-labelledby="footer-heading">
        <h2 id="footer-heading" className="sr-only">Footer</h2>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="xl:grid xl:grid-cols-3 xl:gap-8">
            <div className="space-y-8 xl:col-span-1">
              <div className="text-white font-bold text-2xl">FlyNext</div>
              <p className="text-gray-300 text-base">
                Making travel planning simple, efficient, and enjoyable with the best deals on flights and hotels worldwide.
              </p>
              <div className="flex space-x-6">
                {/* Social Media icons would go here */}
              </div>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Company</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">About</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Careers</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Blog</a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Support</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Help Center</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Contact Us</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">FAQs</a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="md:grid md:grid-cols-2 md:gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Legal</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Privacy</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Terms</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Cookie Policy</a>
                    </li>
                  </ul>
                </div>
                <div className="mt-12 md:mt-0">
                  <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Products</h3>
                  <ul className="mt-4 space-y-4">
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Flights</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Hotels</a>
                    </li>
                    <li>
                      <a href="#" className="text-base text-gray-300 hover:text-white">Vacation Packages</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 xl:text-center">
              &copy; {new Date().getFullYear()} FlyNext. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaMapMarkerAlt, 
  FaStar, 
  FaCheck, 
  FaTimes, 
  FaArrowLeft, 
  FaCalendarAlt, 
  FaMoon, 
  FaSun,
  FaUser,
  FaSignOutAlt,
  FaShoppingCart
} from 'react-icons/fa';
import { addDays } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import dynamic from 'next/dynamic';
import CartDropdown from '@/components/CartDropdown';

// Dynamically import the StaticMap component
const StaticMap = dynamic(() => import('@/components/StaticMap'), { 
  ssr: false 
});

export default function HotelDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hotelId } = params;
  const { user, logout } = useAuth();
  const { addHotelBooking } = useCart();

  // State variables
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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

  // Get check-in/check-out dates from URL or set defaults
  const today = new Date();
  const tomorrow = addDays(today, 1);

  const [checkInDate, setCheckInDate] = useState(
    searchParams.get('checkInDate') || today.toISOString().split('T')[0]
  );
  const [checkOutDate, setCheckOutDate] = useState(
    searchParams.get('checkOutDate') || tomorrow.toISOString().split('T')[0]
  );

  // Calculate total nights
  const startDate = new Date(checkInDate);
  const endDate = new Date(checkOutDate);
  const totalNights = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

  // Fetch hotel details with availability for the selected dates
  useEffect(() => {
    const fetchHotelDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (checkInDate) queryParams.append('checkInDate', checkInDate);
        if (checkOutDate) queryParams.append('checkOutDate', checkOutDate);

        const response = await fetch(`/api/hotels/${hotelId}?${queryParams.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch hotel details');
        }

        const data = await response.json();
        setHotel(data);
      } catch (error) {
        console.error('Error fetching hotel details:', error);
        setError('Failed to load hotel details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (hotelId) {
      fetchHotelDetails();
    }
  }, [hotelId, checkInDate, checkOutDate]);

  // Update URL when dates change without full page reload
  const updateDates = () => {
    const params = new URLSearchParams();
    if (checkInDate) params.append('checkInDate', checkInDate);
    if (checkOutDate) params.append('checkOutDate', checkOutDate);

    router.push(`/hotels/${hotelId}?${params.toString()}`);
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-6 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`${darkMode ? 'bg-red-900/20 text-red-400 border-red-700' : 'bg-red-50 text-red-700 border-red-200'} border px-4 py-3 rounded-md transition-colors duration-300`}>
            {error || 'Hotel not found'}
          </div>
          <div className="mt-4">
            <Link href="/hotels" className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} flex items-center gap-1 transition-colors duration-300`}>
              <FaArrowLeft size={14} /> Back to Hotels
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} pb-12 transition-colors duration-300`}>
      {/* Navigation bar */}
      <nav className={`${darkMode ? 'bg-gray-800 shadow-md' : 'bg-white shadow-md'} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>
                FlyNext
              </Link>
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
              {user ? (
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
                        <FaCalendar size={14} />
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
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className={`px-4 py-2 rounded-md ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} transition-colors duration-300`}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    } transition-colors duration-300`}
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-6">
          <Link href="/hotels" className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} flex items-center gap-1 transition-colors duration-300`}>
            <FaArrowLeft size={14} /> Back to Hotels
          </Link>
        </div>

        {/* Hotel Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>{hotel.name}</h1>
              <div className="flex items-center mt-2 mb-3">
                {[...Array(hotel.starRating)].map((_, i) => (
                  <FaStar key={i} className="text-yellow-400" />
                ))}
                <span className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>{hotel.starRating}-star hotel</span>
              </div>
              <p className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                <FaMapMarkerAlt className="mr-1" />
                {hotel.address}
              </p>
            </div>
            {hotel.logoUrl && (
              <div className="mt-4 md:mt-0">
                <img
                  src={hotel.logoUrl}
                  alt={`${hotel.name} logo`}
                  className="h-20 w-auto object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Image Gallery & Room Types */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden mb-8 transition-colors duration-300`}>
              {hotel.images && hotel.images.length > 0 ? (
                <div>
                  <div className="relative h-80 bg-gray-200">
                    <img
                      src={hotel.images[selectedImage]}
                      alt={`${hotel.name} view ${selectedImage + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {hotel.images.length > 1 && (
                    <div className={`flex p-4 overflow-x-auto space-x-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}>
                      {hotel.images.map((image, index) => (
                        <div
                          key={index}
                          className={`h-20 w-20 flex-shrink-0 cursor-pointer border-2 rounded ${
                            selectedImage === index 
                              ? 'border-blue-600' 
                              : darkMode ? 'border-gray-700' : 'border-transparent'
                          } transition-colors duration-300`}
                          onClick={() => setSelectedImage(index)}
                        >
                          <img
                            src={image}
                            alt={`${hotel.name} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`h-80 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center transition-colors duration-300`}>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-400'} transition-colors duration-300`}>No images available</span>
                </div>
              )}
            </div>

            {/* Room Types */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 transition-colors duration-300`}>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6 transition-colors duration-300`}>Available Room Types</h2>

              {hotel.roomTypes && hotel.roomTypes.length > 0 ? (
                <div className="space-y-8">
                  {hotel.roomTypes.map(room => (
                    <div
                      key={room.id}
                      className={`border rounded-lg overflow-hidden ${
                        !room.available 
                          ? 'opacity-60' 
                          : ''
                      } ${
                        darkMode 
                          ? 'border-gray-700' 
                          : 'border-gray-200'
                      } transition-colors duration-300`}
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Room image */}
                        <div className="md:w-1/3 h-56">
                          {room.images && room.images.length > 0 ? (
                            <img
                              src={room.images[0]}
                              alt={room.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center transition-colors duration-300`}>
                              <span className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`}>No image</span>
                            </div>
                          )}
                        </div>

                        {/* Room details */}
                        <div className={`md:w-2/3 p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} transition-colors duration-300`}>
                          <div className="flex flex-col h-full justify-between">
                            <div>
                              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2 transition-colors duration-300`}>{room.name}</h3>

                              {room.amenities && room.amenities.length > 0 && (
                                <div className="mb-4">
                                  <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 transition-colors duration-300`}>Room amenities:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {room.amenities.map((amenity, index) => (
                                      <span
                                        key={index}
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          darkMode 
                                            ? 'bg-blue-900/30 text-blue-300' 
                                            : 'bg-blue-100 text-blue-800'
                                        } transition-colors duration-300`}
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`}>
                                    ${room.pricePerNight}{' '}
                                    <span className={`text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>/ night</span>
                                  </p>
                                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>
                                    ${(room.pricePerNight * totalNights).toFixed(2)} total for {totalNights} night
                                    {totalNights !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                {room.available ? (
                                  <div className="flex items-center text-green-600">
                                    <FaCheck className="mr-1" />
                                    <span>{room.availableRooms} room(s) available</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-red-600">
                                    <FaTimes className="mr-1" />
                                    <span>Not available</span>
                                  </div>
                                )}
                              </div>

                              {room.available && (
                                <div className="mt-4 flex space-x-2">
                                  <button
                                    className={`flex-1 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-4 rounded transition-colors duration-300`}
                                    onClick={() => {
                                      if (user) {
                                        router.push(
                                          `/booking/hotel/${hotelId}/${room.id}?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
                                        );
                                      } else {
                                        router.push(
                                          `/login?redirect=/booking/hotel/${hotelId}/${room.id}?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
                                        );
                                      }
                                    }}
                                  >
                                    Book Now
                                  </button>
                                  <button
                                    className={`flex-1 border ${
                                      darkMode 
                                        ? 'border-blue-600 text-blue-400 hover:bg-blue-900/20' 
                                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                                    } py-2 px-4 rounded transition-colors duration-300`}
                                    onClick={() => {
                                      addHotelBooking({
                                        hotelId,
                                        hotelName: hotel.name,
                                        roomTypeId: room.id,
                                        roomTypeName: room.name,
                                        checkInDate,
                                        checkOutDate,
                                        numberOfRooms: 1,
                                        pricePerNight: room.pricePerNight,
                                        totalPrice: room.pricePerNight * totalNights,
                                        image: room.images && room.images.length > 0 ? room.images[0] : null
                                      });
                                      setToastMessage(`${room.name} added to cart!`);
                                      setShowToast(true);
                                      setTimeout(() => setShowToast(false), 3000);
                                    }}
                                  >
                                    Add to Cart
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}>No room types available for this hotel.</div>
              )}
            </div>
          </div>

          {/* Right Column: Date Selection & Map */}
          <div>
            {/* Date Selection */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center transition-colors duration-300`}>
                <FaCalendarAlt className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`} />
                Check Availability
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="check-in-date" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    id="check-in-date"
                    value={checkInDate}
                    onChange={(e) => {
                      setCheckInDate(e.target.value);
                      // If check-out date is before new check-in date, adjust it
                      if (new Date(e.target.value) >= new Date(checkOutDate)) {
                        const nextDay = new Date(e.target.value);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setCheckOutDate(nextDay.toISOString().split('T')[0]);
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                  />
                </div>

                <div>
                  <label htmlFor="check-out-date" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-1 transition-colors duration-300`}>
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    id="check-out-date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={(() => {
                      // Minimum checkout is the day after checkin
                      const minDate = new Date(checkInDate);
                      minDate.setDate(minDate.getDate() + 1);
                      return minDate.toISOString().split('T')[0];
                    })()}
                    className={`block w-full pl-3 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                      : 'border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                    } transition-colors duration-300`}
                  />
                </div>

                <button
                  onClick={updateDates}
                  className={`w-full ${
                    darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  } text-white py-2 px-4 rounded transition-colors duration-300`}
                >
                  Update Dates
                </button>
              </div>
            </div>

            {/* Map Location */}
            {hotel.latitude && hotel.longitude && (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 mb-8 transition-colors duration-300`}>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 flex items-center transition-colors duration-300`}>
                  <FaMapMarkerAlt className={`mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-colors duration-300`} />
                  Location
                </h2>
                <div className={`h-64 rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-300'} transition-colors duration-300`}>
                  <StaticMap latitude={hotel.latitude} longitude={hotel.longitude} />
                </div>
                <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>{hotel.address}</p>
              </div>
            )}

            {/* Hotel Policies */}
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 transition-colors duration-300`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4 transition-colors duration-300`}>Hotel Policies</h2>
              <div className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} transition-colors duration-300`}>
                <p>
                  <span className="font-medium">Check-in:</span> After 3:00 PM
                </p>
                <p>
                  <span className="font-medium">Check-out:</span> Before 11:00 AM
                </p>
                <p>
                  <span className="font-medium">Cancellation:</span> Free cancellation up to 24 hours before check-in
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-5 right-5">
          <div className={`${darkMode ? 'bg-green-700' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center transition-colors duration-300`}>
            <span className="text-sm">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
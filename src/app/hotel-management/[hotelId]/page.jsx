'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaBed, FaCalendarAlt, FaEdit, FaHotel, FaMapMarkerAlt, FaStar, FaEnvelope, FaPhone, FaGlobe } from 'react-icons/fa';

function HotelDetailContent() {
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, initialized, logout } = useAuth();
  const hotelId = params.hotelId;

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

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
      fetchHotelDetails();
    }
  }, [initialized, user, hotelId, router]);

  const fetchHotelDetails = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hotels/${hotelId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hotel details');
      }

      const data = await response.json();
      console.log('Hotel data:', data); // For debugging
      setHotel(data);
    } catch (err) {
      console.error('Error fetching hotel details:', err);
      setError('Failed to load hotel details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getHotelImage = () => {
    if (!hotel) return null;

    if (hotel.logoUrl) return hotel.logoUrl;

    if (hotel.images) {
      if (typeof hotel.images === 'string') {
        try {
          const parsedImages = JSON.parse(hotel.images);
          return Array.isArray(parsedImages) && parsedImages.length > 0 ? parsedImages[0] : null;
        } catch (e) {
          return hotel.images;
        }
      } else if (Array.isArray(hotel.images) && hotel.images.length > 0) {
        return hotel.images[0];
      }
    }

    return null;
  };

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (initialized && !user) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="text-center">
          <FaHotel className={`mx-auto h-12 w-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mb-4`} />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Please log in to view hotel management details.</p>
          <Link 
            href="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-300"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/hotel-management" 
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to All Hotels
                </Link>
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
        <div className="max-w-7xl mx-auto pt-16 pb-24 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mr-4"></div>
            <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading hotel details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/hotel-management" 
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to All Hotels
                </Link>
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
        <div className="max-w-7xl mx-auto pt-16 pb-24 px-4 sm:px-6 lg:px-8">
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 p-6 rounded-md`}>
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p>{error}</p>
            <button 
              onClick={fetchHotelDetails} 
              className={`mt-4 ${darkMode ? 'bg-red-800 hover:bg-red-700' : 'bg-red-100 hover:bg-red-200'} px-4 py-2 rounded-md transition-colors duration-300`}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Link 
                  href="/hotel-management" 
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to All Hotels
                </Link>
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
        <div className="max-w-7xl mx-auto pt-16 pb-24 px-4 sm:px-6 lg:px-8">
          <div className={`text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-12`}>
            <FaHotel className={`mx-auto h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
            <h2 className="text-xl font-bold mb-2">Hotel Not Found</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>The hotel you're looking for could not be found.</p>
            <Link 
              href="/hotel-management" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-300 inline-flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Return to Hotel Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center mb-4">
                <Link 
                  href="/hotel-management" 
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to All Hotels
                </Link>
              </div>
              <h1 className="text-3xl font-bold">{hotel.name}</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {getHotelImage() && (
          <div className="mb-12 overflow-hidden rounded-xl shadow-lg">
            <img 
              src={getHotelImage()} 
              alt={hotel.name}
              className="w-full h-[400px] object-cover" 
            />
          </div>
        )}

        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Hotel Management</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-md transition-all duration-300 border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className={`mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              <FaBed className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Room Types</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Manage your room types, pricing, and availability</p>
            <Link 
              href={`/hotel-management/${hotelId}/room-types`}
              className="mt-4 block bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-center transition-colors duration-300"
            >
              Manage Rooms
            </Link>
          </div>

          <div className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-md transition-all duration-300 border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className={`mb-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              <FaCalendarAlt className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Bookings</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>View and manage current and upcoming reservations</p>
            <Link 
              href={`/hotel-management/${hotelId}/bookings`}
              className="mt-4 block bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-center transition-colors duration-300"
            >
              Manage Bookings
            </Link>
          </div>

          <div className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} p-6 rounded-lg shadow-md transition-all duration-300 border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className={`mb-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
              <FaEdit className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Edit Hotel Details</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Update your hotel information, amenities, and images</p>
            <Link 
              href={`/hotel-management/${hotelId}/edit`}
              className="mt-4 block bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-center transition-colors duration-300"
            >
              Edit Details
            </Link>
          </div>
        </div>

        <div className={`mt-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <h2 className="text-xl font-semibold mb-4">Hotel Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {hotel.address && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Address
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-start`}>
                    <FaMapMarkerAlt className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{hotel.address}</span>
                  </p>
                </div>
              )}
              
              {hotel.description && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hotel.description}
                  </p>
                </div>
              )}
              
              {hotel.amenities && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Amenities
                  </h3>
                  <ul className={`list-disc pl-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {(typeof hotel.amenities === 'string' 
                      ? JSON.parse(hotel.amenities) 
                      : hotel.amenities).map((amenity, index) => (
                      <li key={index}>{amenity}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {hotel.checkInTime && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Check-in/Check-out
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Check-in: {hotel.checkInTime}
                    {hotel.checkOutTime && ` • Check-out: ${hotel.checkOutTime}`}
                  </p>
                </div>
              )}
              
              {hotel.city && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Location
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-start`}>
                    <FaMapMarkerAlt className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                    <span>
                      {hotel.city}
                      {hotel.state && `, ${hotel.state}`}
                      {hotel.country && `, ${hotel.country}`}
                      {hotel.postalCode && ` ${hotel.postalCode}`}
                    </span>
                  </p>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {hotel.starRating && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Star Rating
                  </h3>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <FaStar 
                        key={i}
                        className={`w-5 h-5 ${
                          i < hotel.starRating 
                            ? 'text-yellow-500' 
                            : darkMode ? 'text-gray-600' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {hotel.starRating} out of 5
                    </span>
                  </div>
                </div>
              )}
              
              {(hotel.email || hotel.phoneNumber || hotel.website) && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Contact Information
                  </h3>
                  
                  {hotel.email && (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center mb-2`}>
                      <FaEnvelope className="h-4 w-4 mr-2" />
                      {hotel.email}
                    </p>
                  )}
                  
                  {hotel.phoneNumber && (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center mb-2`}>
                      <FaPhone className="h-4 w-4 mr-2" />
                      {hotel.phoneNumber}
                    </p>
                  )}
                  
                  {hotel.website && (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center`}>
                      <FaGlobe className="h-4 w-4 mr-2" />
                      <a 
                        href={hotel.website.startsWith('http') ? hotel.website : `https://${hotel.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-500 hover:underline"
                      >
                        {hotel.website}
                      </a>
                    </p>
                  )}
                </div>
              )}
              
              {(hotel.policies || hotel.cancellationPolicy) && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Policies
                  </h3>
                  
                  {hotel.policies && (
                    <div className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className="font-medium mb-1">Hotel Policies:</p>
                      <p>{hotel.policies}</p>
                    </div>
                  )}
                  
                  {hotel.cancellationPolicy && (
                    <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className="font-medium mb-1">Cancellation Policy:</p>
                      <p>{hotel.cancellationPolicy}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HotelDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    }>
      <HotelDetailContent />
    </Suspense>
  );
}
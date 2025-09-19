'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
// Add the missing icon imports
import { FaHotel, FaPlus, FaSignOutAlt, FaMoon, FaSun, FaCog, FaBed, FaCalendarAlt, FaEdit, FaTrash, FaEye } from 'react-icons/fa';

function HotelManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, logout } = useAuth();
  
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
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

  const handleTokenExpired = async () => {
    setRedirecting(true);
    await logout();

    setTimeout(() => {
      router.push('/login?expired=true&redirect=/hotel-management');
    }, 1500);
  };

  const handleLogout = async () => {
    setRedirecting(true);
    await logout();
    router.push('/login');
  };

  useEffect(() => {
    if (!initialized) {
      return;
    }

    if (!user) {
      router.push('/login?redirect=/hotel-management');
      return;
    }

    fetchUserHotels();
  }, [initialized, user, router]);

  const fetchUserHotels = async () => {
    if (loading === false) setLoading(true);

    try {
      const accessToken = localStorage.getItem('accessToken');

      if (!accessToken) {
        console.error('No access token found');
        throw new Error('Authentication required. Please log in.');
      }

      const response = await fetch('/api/hotels/user-owned', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.error === 'Token expired') {
          await handleTokenExpired();
          return;
        } else {
          await logout();
          router.push('/login?redirect=/hotel-management');
          return;
        }
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.length} hotels`);
      setHotels(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch hotels:', err);
      setError(err.message || 'Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  const getHotelCoverImage = (hotel) => {
    if (hotel.logoUrl) return hotel.logoUrl;

    if (hotel.images) {
      if (typeof hotel.images === 'string') {
        try {
          const parsedImages = JSON.parse(hotel.images);
          return Array.isArray(parsedImages) && parsedImages.length > 0
            ? parsedImages[0]
            : null;
        } catch (e) {
          return hotel.images;
        }
      } else if (Array.isArray(hotel.images) && hotel.images.length > 0) {
        return hotel.images[0];
      }
    }

    return null;
  };

  if (redirecting) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} flex flex-col justify-center items-center transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className={`text-lg ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Your session has expired.</p>
        <p className={`text-md ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>Redirecting to login page...</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">My Hotels</h1>
                <p className="text-blue-100 mt-1">Manage your properties and availability</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full shadow-sm transition-all duration-300"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-md font-medium shadow-sm flex items-center transition-all duration-300"
                >
                  <FaSignOutAlt className="mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'} transition-colors duration-300`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-12 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">My Hotels</h1>
              <p className="text-blue-100 mt-1">Manage your properties and availability</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={toggleDarkMode}
                className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full shadow-sm transition-all duration-300"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              <button
                onClick={handleLogout}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-md font-medium shadow-sm flex items-center transition-all duration-300"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
              <Link
                href="/"
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-md font-medium shadow-sm flex items-center transition-all duration-300"
              >
                Back to Home
              </Link>
              <Link
                href="/hotel-management/create"
                className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-md font-medium shadow-sm flex items-center transition-all duration-300"
              >
                <FaPlus className="mr-2" />
                Create New Hotel
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 p-4 mb-6 rounded-md shadow-sm transition-colors duration-300`}>
            <div className="flex items-center">
              <FaExclamationCircle className={`${darkMode ? 'text-red-400' : 'text-red-500'} mr-2 flex-shrink-0`} />
              <div>
                <p className="font-medium">Error Loading Hotels</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={fetchUserHotels}
                  className={`mt-2 ${darkMode ? 'bg-red-900/30 hover:bg-red-900/50 text-red-300' : 'bg-red-100 hover:bg-red-200 text-red-800'} px-4 py-1 rounded text-sm transition-colors duration-300`}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {hotels.length === 0 && !error ? (
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-md rounded-lg p-12 text-center transition-colors duration-300`}>
            <div className={`mx-auto w-24 h-24 ${darkMode ? 'bg-blue-900/50' : 'bg-blue-100'} rounded-full flex items-center justify-center mb-6 transition-colors duration-300`}>
              <FaHotel className={`h-12 w-12 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No Hotels Yet</h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8 max-w-md mx-auto`}>
              Start by creating your first property to manage bookings and rooms.
            </p>
            <Link
              href="/hotel-management/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md inline-flex items-center transition-colors duration-300 shadow-sm"
            >
              <FaPlus className="mr-2" />
              Create Your First Hotel
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border`}
              >
                <div className="h-48 bg-gray-200 relative">
                  {getHotelCoverImage(hotel) ? (
                    <Image
                      src={getHotelCoverImage(hotel)}
                      alt={hotel.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <FaHotel className={`h-12 w-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full text-sm font-semibold text-yellow-600 shadow-sm flex items-center">
                    <span>{hotel.starRating}</span>
                    <span className="text-yellow-500 ml-1">★</span>
                  </div>
                </div>

                <div className="p-6">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>{hotel.name}</h2>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-5 flex items-start`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-5 w-5 mr-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'} flex-shrink-0 mt-0.5`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="line-clamp-2">{hotel.address}</span>
                  </p>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <Link
                      href={`/hotel-management/${hotel.id}`}
                      className={`flex flex-col items-center justify-center ${
                        darkMode ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                      } p-3 rounded-md transition-colors duration-300`}
                    >
                      <FaCog className="h-5 w-5 mb-1" />
                      <span className="text-sm font-medium">Manage</span>
                    </Link>
                    <Link
                      href={`/hotel-management/${hotel.id}/room-types`}
                      className={`flex flex-col items-center justify-center ${
                        darkMode ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400' : 'bg-green-50 hover:bg-green-100 text-green-700'
                      } p-3 rounded-md transition-colors duration-300`}
                    >
                      <FaBed className="h-5 w-5 mb-1" />
                      <span className="text-sm font-medium">Rooms</span>
                    </Link>
                    <Link
                      href={`/hotel-management/${hotel.id}/bookings`}
                      className={`flex flex-col items-center justify-center ${
                        darkMode ? 'bg-purple-900/30 hover:bg-purple-900/50 text-purple-400' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                      } p-3 rounded-md transition-colors duration-300`}
                    >
                      <FaCalendarAlt className="h-5 w-5 mb-1" />
                      <span className="text-sm font-medium">Bookings</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HotelManagement() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel management...</p>
        </div>
      </div>
    }>
      <HotelManagementContent />
    </Suspense>
  );
}
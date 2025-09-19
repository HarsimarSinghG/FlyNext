'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaBed, FaPlus, FaHotel, FaEdit, FaCalendarAlt, FaTrash, FaWifi, FaSwimmingPool, FaParking } from 'react-icons/fa';

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const params = useParams();
  const router = useRouter();
  const { user, initialized, logout } = useAuth();
  const hotelId = params.hotelId;

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
      fetchHotelAndRoomTypes();
    }
  }, [initialized, user, hotelId, router]);

  const fetchHotelAndRoomTypes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');

      // Fetch hotel details
      const hotelResponse = await fetch(`/api/hotels/${hotelId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!hotelResponse.ok) {
        throw new Error('Failed to fetch hotel details');
      }

      const hotelData = await hotelResponse.json();
      setHotel(hotelData);

      // Fetch room types
      const roomTypesResponse = await fetch(`/api/hotels/${hotelId}/room-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!roomTypesResponse.ok) {
        throw new Error('Failed to fetch room types');
      }

      const roomTypesData = await roomTypesResponse.json();
      setRoomTypes(roomTypesData);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoomType = async (roomTypeId, roomTypeName) => {
    if (!confirm(`Are you sure you want to delete "${roomTypeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete room type');
      }

      // Remove the deleted room type from the list
      setRoomTypes(roomTypes.filter(room => room.id !== roomTypeId));

      // Show success toast or message
      const successMessage = document.getElementById('success-message');
      if (successMessage) {
        successMessage.textContent = `Room type "${roomTypeName}" deleted successfully`;
        successMessage.classList.remove('hidden');
        setTimeout(() => {
          successMessage.classList.add('hidden');
        }, 3000);
      }
    } catch (err) {
      console.error('Error deleting room type:', err);
      
      // Show error toast or message
      const errorMessage = document.getElementById('error-message');
      if (errorMessage) {
        errorMessage.textContent = 'Failed to delete room type. Please try again.';
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
          errorMessage.classList.add('hidden');
        }, 3000);
      }
    }
  };

  // Helper function to get room amenity icon
  const getAmenityIcon = (amenity) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) {
      return <FaWifi className="mr-1" />;
    } else if (amenityLower.includes('pool') || amenityLower.includes('swim')) {
      return <FaSwimmingPool className="mr-1" />;
    } else if (amenityLower.includes('parking')) {
      return <FaParking className="mr-1" />;
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
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Please log in to view room types.</p>
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
                  href={`/hotel-management/${hotelId}`}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to Hotel
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
            <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading room types...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center mb-4">
                <Link 
                  href={`/hotel-management/${hotelId}`} 
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-md flex items-center transition-colors duration-300"
                >
                  <FaArrowLeft className="mr-2" />
                  Back to Hotel
                </Link>
              </div>
              <h1 className="text-3xl font-bold flex items-center">
                <FaBed className="mr-3" /> 
                Room Types
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
              <Link 
                href="/hotel-management" 
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300"
              >
                <FaHotel className="mr-2" />
                All Hotels
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Messages */}
        <div id="success-message" className="hidden mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          Success message will appear here
        </div>
        <div id="error-message" className="hidden mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          Error message will appear here
        </div>
        
        {/* Add New Room Type Button */}
        <div className="mb-8">
          <Link 
            href={`/hotel-management/${hotelId}/room-types/create`}
            className={`${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white py-3 px-6 rounded-md inline-flex items-center transition-colors duration-300 shadow-sm`}
          >
            <FaPlus className="mr-2" />
            Add New Room Type
          </Link>
        </div>

        {/* Room Types Grid */}
        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-500 text-red-700'} border-l-4 p-6 rounded-md mb-8`}>
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p>{error}</p>
            <button 
              onClick={fetchHotelAndRoomTypes} 
              className={`mt-4 ${darkMode ? 'bg-red-800 hover:bg-red-700' : 'bg-red-100 hover:bg-red-200'} px-4 py-2 rounded-md transition-colors duration-300`}
            >
              Try Again
            </button>
          </div>
        )}

        {!error && roomTypes.length === 0 ? (
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-12 text-center rounded-lg shadow-md border`}>
            <div className={`mx-auto w-20 h-20 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full flex items-center justify-center mb-6`}>
              <FaBed className={`h-10 w-10 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h2 className="text-2xl font-semibold mb-3">No Room Types Yet</h2>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8 max-w-md mx-auto`}>
              Create your first room type to start receiving bookings. Define rates, amenities, and availability.
            </p>
            <Link 
              href={`/hotel-management/${hotelId}/room-types/create`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md inline-flex items-center transition-colors duration-300"
            >
              <FaPlus className="mr-2" />
              Create First Room Type
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomTypes.map((roomType) => (
              <div 
                key={roomType.id} 
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border`}
              >
                <div className="h-48 bg-gray-200 relative">
                  {roomType.images && roomType.images.length > 0 ? (
                    <img
                      src={Array.isArray(roomType.images) ? roomType.images[0] : roomType.images[0]?.url}
                      alt={roomType.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`}>
                      <FaBed className={`h-16 w-16 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-bold text-green-600 shadow-sm">
                    ${roomType.pricePerNight.toFixed(2)}
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className={`font-bold text-xl mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{roomType.name}</h3>
                  
                  <div className={`flex items-center mt-2 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <FaCalendarAlt className="mr-2" />
                    <span>Availability: {roomType.baseAvailability} rooms</span>
                  </div>
                  
                  {roomType.description && (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-4 line-clamp-2`}>
                      {roomType.description}
                    </p>
                  )}
                  
                  {roomType.amenities && Array.isArray(roomType.amenities) && roomType.amenities.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {roomType.amenities.slice(0, 3).map((amenity, index) => (
                        <span 
                          key={index} 
                          className={`${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'} text-xs px-2 py-1 rounded-full flex items-center`}
                        >
                          {getAmenityIcon(amenity)}
                          {amenity}
                        </span>
                      ))}
                      {roomType.amenities.length > 3 && (
                        <span className={`${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-800'} text-xs px-2 py-1 rounded-full`}>
                          +{roomType.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-6 grid grid-cols-3 gap-2">
                    <Link 
                      href={`/hotel-management/${hotelId}/room-types/${roomType.id}/edit`}
                      className={`${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 rounded flex items-center justify-center transition-colors duration-300`}
                    >
                      <FaEdit className="mr-1" />
                      <span>Edit</span>
                    </Link>
                    <Link 
                      href={`/hotel-management/${hotelId}/room-types/${roomType.id}/availability`}
                      className={`${darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'} text-white py-2 rounded flex items-center justify-center transition-colors duration-300`}
                    >
                      <FaCalendarAlt className="mr-1" />
                      <span>Availability</span>
                    </Link>
                    <button 
                      onClick={() => handleDeleteRoomType(roomType.id, roomType.name)}
                      className={`${darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white py-2 rounded flex items-center justify-center transition-colors duration-300`}
                    >
                      <FaTrash className="mr-1" />
                      <span>Delete</span>
                    </button>
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
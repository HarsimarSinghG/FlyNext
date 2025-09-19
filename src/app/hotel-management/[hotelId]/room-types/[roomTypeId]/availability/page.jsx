"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaCalendarAlt, FaBed, FaHotel } from 'react-icons/fa';

export default function ManageAvailability() {
  const { hotelId, roomTypeId } = useParams();
  const router = useRouter();
  const { user, initialized, authFetch, logout } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableRooms, setAvailableRooms] = useState(1);
  const [bookedRooms, setBookedRooms] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [manuallySetDates, setManuallySetDates] = useState(new Set());
  const [darkMode, setDarkMode] = useState(false);
  
  // Cancellation handling
  const [bookingConflict, setBookingConflict] = useState(null);
  const [showCancellationConfirmation, setShowCancellationConfirmation] = useState(false);

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

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch room type details and availability when component mounts or refreshTrigger changes
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
      return;
    }

    if (initialized && user) {
      fetchRoomTypeAndAvailability();
    }
  }, [initialized, user, hotelId, roomTypeId, router, refreshTrigger]);

  const fetchRoomTypeAndAvailability = async () => {
    try {
      setIsLoading(true);
      
      // Fetch room type details
      const roomTypeResponse = await authFetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}`);
      
      if (!roomTypeResponse.ok) {
        throw new Error('Failed to fetch room type details');
      }
      
      const roomTypeData = await roomTypeResponse.json();
      setRoomType(roomTypeData);
      
      // Fetch availability data
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      
      const availabilityResponse = await authFetch(
        `/api/hotels/${hotelId}/room-types/${roomTypeId}/availability/check?startDate=${today.toISOString().split('T')[0]}&endDate=${thirtyDaysFromNow.toISOString().split('T')[0]}`
      );
      
      if (!availabilityResponse.ok) {
        throw new Error('Failed to fetch availability data');
      }
      
      const availabilityData = await availabilityResponse.json();
      setAvailability(availabilityData.availability || []);
      
      // Track which dates have manually set availability
      const manualDates = new Set();
      for (const avail of availabilityData.availability || []) {
        if (avail.isManuallySet) {
          manualDates.add(avail.date);
        }
      }
      setManuallySetDates(manualDates);
      
      // Update selected date info after fetching new data
      updateSelectedDateInfo(selectedDate, availabilityData.availability || []);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update the info for the selected date
  const updateSelectedDateInfo = (date, availabilityData) => {
    const dateStr = date.toISOString().split('T')[0];
    const dateAvailability = availabilityData.find(a => a.date === dateStr);
    
    if (dateAvailability) {
      setAvailableRooms(dateAvailability.availableRooms);
      setBookedRooms(dateAvailability.bookedRooms || 0);
    } else if (roomType) {
      setAvailableRooms(roomType.baseAvailability);
      setBookedRooms(0);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    updateSelectedDateInfo(date, availability);
    
    // Clear any previous booking conflicts
    setBookingConflict(null);
    setShowCancellationConfirmation(false);
  };

  const handleSaveAvailability = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Check if the new availability is less than booked rooms
      if (parseInt(availableRooms) < bookedRooms) {
        setShowCancellationConfirmation(true);
        setIsSaving(false);
        return;
      }
      
      const response = await authFetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { 
            date: dateStr, 
            availableRooms: parseInt(availableRooms)
          }
        ])
      });
      
      if (response.status === 409) {
        // If we get a conflict, show the confirmation dialog
        const conflictData = await response.json();
        setBookingConflict(conflictData);
        setShowCancellationConfirmation(true);
        // Don't set error for booking conflicts, just show the modal
        setIsSaving(false);
        return;
      }
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update availability');
      }
      
      const data = await response.json();
      
      // Add this date to our set of manually set dates
      setManuallySetDates(prev => {
        const newSet = new Set(prev);
        newSet.add(dateStr);
        return newSet;
      });
      
      setSuccessMessage(`Availability updated successfully for ${dateStr}`);
      
      // Trigger a refresh by incrementing the refresh counter
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle confirmed cancellation
  const handleCancellationConfirmed = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Call the API with forceCancellation query parameter
      const response = await authFetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/availability?forceCancellation=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          { 
            date: dateStr, 
            availableRooms: parseInt(availableRooms)
          }
        ])
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update availability');
      }
      
      const data = await response.json();
      
      // Calculate how many bookings were cancelled
      let cancelledCount = 0;
      if (data.results) {
        for (const result of data.results) {
          if (result.cancelledBookings) {
            cancelledCount += result.cancelledBookings;
          }
        }
      }
      
      // Add this date to our set of manually set dates
      setManuallySetDates(prev => {
        const newSet = new Set(prev);
        newSet.add(dateStr);
        return newSet;
      });
      
      setSuccessMessage(`Availability updated to ${availableRooms} rooms. ${cancelledCount} booking(s) were cancelled.`);
      setShowCancellationConfirmation(false);
      setBookingConflict(null);
      
      // Trigger a refresh by incrementing the refresh counter
      setRefreshTrigger(prev => prev + 1);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to get tile content for calendar
  const getTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = date.toISOString().split('T')[0];
    const dateAvailability = availability.find(a => a.date === dateStr);
    
    if (!dateAvailability) return null;
    
    // Calculate the actual available rooms
    const availableRoomsCount = dateAvailability.availableRooms;
    const isManuallySet = manuallySetDates.has(dateStr);
    
    // Set color based on availability
    let colorClass = darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800';
    
    if (availableRoomsCount === 0) {
      colorClass = darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800';
    } else if (availableRoomsCount <= 2) {
      colorClass = darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
    }
    
    // Add a border for manually set availability
    const borderClass = isManuallySet 
      ? darkMode ? 'border border-blue-500' : 'border border-blue-500' 
      : '';
    
    return (
      <div className={`text-xs mt-1 ${colorClass} ${borderClass} p-1 rounded text-center font-medium`}>
        {availableRoomsCount} {isManuallySet && <span>*</span>}
      </div>
    );
  };

  // Custom tile class for the calendar
  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const dateStr = date.toISOString().split('T')[0];
    const baseClass = darkMode ? 'dark-calendar-tile' : '';
    
    // Add a special class for manually set dates
    return manuallySetDates.has(dateStr) 
      ? `${baseClass} manually-set-date` 
      : baseClass;
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
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Please log in to manage room availability.</p>
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

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold flex items-center">
                <FaCalendarAlt className="mr-3" /> 
                Manage Availability
              </h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full shadow-sm transition-all duration-300"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mr-3"></div>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading room availability data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Get status for the selected date
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const isSelectedDateManuallySet = manuallySetDates.has(selectedDateStr);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaCalendarAlt className="mr-3" /> 
                Manage Availability
                {roomType && <span className="ml-2">- {roomType.name}</span>}
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

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex flex-wrap gap-2 mb-6">
          <Link 
            href={`/hotel-management/${hotelId}/room-types`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            Back to Room Types
          </Link>
          
          <Link 
            href={`/hotel-management/${hotelId}`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaHotel className="mr-2" />
            Back to Hotel
          </Link>
        </div>

        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-800'} border px-6 py-4 rounded-md mb-6`}>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className={`${darkMode ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-800'} border px-6 py-4 rounded-md mb-6`}>
            <p className="font-medium">Success!</p>
            <p>{successMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md rounded-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-semibold mb-4">Room Availability Calendar</h3>
              <div className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <div className="flex items-center mb-1">
                  <span className={`inline-block w-3 h-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-100'} mr-1 rounded`}></span> Good availability
                </div>
                <div className="flex items-center mb-1">
                  <span className={`inline-block w-3 h-3 ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-100'} mr-1 rounded`}></span> Limited availability
                </div>
                <div className="flex items-center mb-1">
                  <span className={`inline-block w-3 h-3 ${darkMode ? 'bg-red-900/30' : 'bg-red-100'} mr-1 rounded`}></span> No availability
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 border border-blue-500 mr-1 rounded"></span> Manually set
                </div>
              </div>
              <div className={`custom-calendar ${darkMode ? 'dark-mode-calendar' : ''}`}>
                <Calendar 
                  onChange={handleDateChange} 
                  value={selectedDate} 
                  tileContent={getTileContent}
                  tileClassName={getTileClassName}
                  minDate={new Date()}
                  className={`border-0 ${darkMode ? 'dark-calendar' : ''}`}
                />
              </div>
              
              <style jsx global>{`
                .react-calendar {
                  background: ${darkMode ? '#1f2937' : '#fff'};
                  color: ${darkMode ? '#fff' : '#000'};
                  border: 1px solid ${darkMode ? '#374151' : '#e5e7eb'};
                }
                .react-calendar__navigation button {
                  color: ${darkMode ? '#fff' : '#000'};
                }
                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:enabled:focus {
                  background-color: ${darkMode ? '#374151' : '#e6e6e6'};
                }
.react-calendar__tile {
  color: ${darkMode ? '#fff' : '#000'};
  background: ${darkMode ? '#1f2937' : '#f3f4f6'};
}
.react-calendar__tile:enabled:hover,
.react-calendar__tile:enabled:focus {
  background-color: ${darkMode ? '#374151' : '#d1d5db'};
}
                .react-calendar__tile--active {
                  background: ${darkMode ? '#3b82f6' : '#000'};
                  color: yellow;
                }
                .react-calendar__tile--active:enabled:hover,
                .react-calendar__tile--active:enabled:focus {
                  background: ${darkMode ? '#2563eb' : '#1087ff'};
                }
                .react-calendar__month-view__weekdays {
                  color: ${darkMode ? '#9ca3af' : '#757575'};
                }
                .react-calendar__tile--now {
                  background: ${darkMode ? '#4b5563' : '#ffff76'};
                }
                .react-calendar__tile--now:enabled:hover,
                .react-calendar__tile--now:enabled:focus {
                  background: ${darkMode ? '#6b7280' : '#000'};
                }
              `}</style>
            </div>
          </div>

          <div>
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md rounded-lg p-6 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-semibold mb-4">Update Availability</h3>
              
              <div className="mb-6">
                <p className={`${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Selected date: <strong>{selectedDate.toLocaleDateString()}</strong>
                </p>
                {isSelectedDateManuallySet && (
                  <p className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} text-sm font-medium mt-1`}>
                    <span className="inline-block w-2 h-2 border border-blue-500 mr-1"></span>
                    Manually set availability
                  </p>
                )}
                {roomType && (
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-2`}>
                    Base availability: {roomType.baseAvailability} rooms
                  </p>
                )}
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>
                  Currently booked: {bookedRooms} rooms
                </p>
                <p className={`font-medium text-sm mt-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Available rooms: {availableRooms} room{availableRooms !== 1 ? 's' : ''}
                </p>
                {availableRooms < bookedRooms && (
                  <div className={`${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'} p-2 rounded mt-2`}>
                    <p className="text-sm font-semibold">
                      Warning: Setting availability below booked rooms will cancel some bookings!
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="availableRooms">
                  Set Total Available Rooms
                </label>
                <input
                  id="availableRooms"
                  type="number"
                  min="0"
                  max={roomType?.baseAvailability || 10}
                  value={availableRooms}
                  onChange={(e) => setAvailableRooms(parseInt(e.target.value) || 0)}
                  className={`shadow appearance-none border rounded w-full py-2 px-3 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-700'
                  } leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              
              <button
                onClick={handleSaveAvailability}
                disabled={isSaving}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full transition-colors duration-300 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Availability'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Booking Cancellation Confirmation Modal */}
        {showCancellationConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-lg p-6 max-w-lg w-full m-4 shadow-xl`}>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'} mb-4`}>
                Warning: Existing Bookings Will Be Affected
              </h2>
              
              {bookingConflict ? (
                <p className="mb-4">
                  Reducing the availability to <strong>{bookingConflict.requestedAvailability}</strong> rooms 
                  will affect <strong>{bookingConflict.existingBookings - bookingConflict.requestedAvailability}</strong> existing 
                  booking(s). These bookings will need to be cancelled.
                </p>
              ) : (
                <p className="mb-4">
                  Reducing the availability to <strong>{availableRooms}</strong> rooms 
                  will affect <strong>{bookedRooms - availableRooms}</strong> existing 
                  booking(s). These bookings will need to be cancelled.
                </p>
              )}
              
              {bookingConflict && bookingConflict.affectedBookings && bookingConflict.affectedBookings.length > 0 && (
                <div className="mb-4">
                  <h3 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'} mb-2`}>
                    Bookings that will be cancelled:
                  </h3>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-3 rounded max-h-60 overflow-auto`}>
                    <ul className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      {bookingConflict.affectedBookings.map((booking) => (
                        <li key={booking.id} className="py-2">
                          <p className="font-medium">
                            {booking.booking?.user 
                              ? `${booking.booking.user.firstName || ''} ${booking.booking.user.lastName || ''}`.trim() 
                              : 'Unknown Guest'}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {new Date(booking.checkInDate).toLocaleDateString()} to {new Date(booking.checkOutDate).toLocaleDateString()}
                          </p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {booking.booking?.user?.email || 'No email available'}
                          </p>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              booking.status === 'confirmed' 
                                ? darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800' 
                                : darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.status}
                            </span>
                            <span className={`ml-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {booking.numberOfRooms} room{booking.numberOfRooms !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCancellationConfirmation(false)}
                  className={`px-4 py-2 ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  } rounded focus:outline-none transition-colors duration-300`}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancellationConfirmed}
                  className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded focus:outline-none transition-colors duration-300 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                      Processing...
                    </div>
                  ) : (
                    'Proceed & Cancel Bookings'
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
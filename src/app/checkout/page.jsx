'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  FaLock,
  FaCreditCard,
  FaTrashAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaMoon,
  FaSun,
  FaUser,
  FaSignOutAlt,
} from 'react-icons/fa';
import CartDropdown from '@/components/CartDropdown';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, getIdToken, logout } = useAuth();
  const { cartItems, cartTotal, removeItem, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Refs for user menu
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);

  // Payment form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

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

  // Get authentication token when component mounts
  useEffect(() => {
    const fetchToken = async () => {
      if (user) {
        try {
          const idToken = await getIdToken();
          setToken(idToken);
          console.log('Token retrieved successfully');
        } catch (err) {
          console.error('Error getting auth token:', err);
          setError('Authentication error. Please try logging in again.');
        }
      }
    };

    fetchToken();
  }, [user, getIdToken]);

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!user) {
    return (
      <div
        className={`min-h-screen ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        } flex flex-col items-center justify-center p-4 transition-colors duration-300`}
      >
        <div
          className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } p-8 rounded-lg shadow-md max-w-md w-full transition-colors duration-300`}
        >
          <h1
            className={`text-2xl font-bold text-center mb-6 ${
              darkMode ? 'text-white' : 'text-gray-900'
            } transition-colors duration-300`}
          >
            Login Required
          </h1>
          <p
            className={`${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            } mb-6 text-center transition-colors duration-300`}
          >
            Please log in to complete your booking.
          </p>
          <Link
            href={`/login?redirect=/checkout`}
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors duration-300"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div
        className={`min-h-screen ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        } transition-colors duration-300`}
      >
        {/* Navigation bar */}
        <nav
          className={`${
            darkMode ? 'bg-gray-800 shadow-md' : 'bg-white shadow-md'
          } transition-colors duration-300`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link
                    href="/"
                    className={`text-2xl font-bold ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    } transition-colors duration-300`}
                  >
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
                  aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
                </button>

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
                      <div
                        className={`px-4 py-3 border-b ${
                          darkMode ? 'border-gray-700' : 'border-gray-100'
                        } transition-colors duration-300`}
                      >
                        <p
                          className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          } transition-colors duration-300`}
                        >
                          Signed in as
                        </p>
                        <p
                          className={`text-sm font-medium truncate ${
                            darkMode ? 'text-gray-200' : 'text-gray-800'
                          } transition-colors duration-300`}
                        >
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href="/profile"
                        className={`block px-4 py-2 text-sm ${
                          darkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        } transition-colors duration-300 flex items-center gap-2`}
                      >
                        <FaUser size={14} />
                        <span>Profile</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className={`block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2 ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } transition-colors duration-300`}
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

        <div className="flex flex-col items-center justify-center p-4 min-h-[80vh]">
          <div
            className={`${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } p-8 rounded-lg shadow-md max-w-md w-full text-center transition-colors duration-300`}
          >
            <h1
              className={`text-2xl font-bold mb-6 ${
                darkMode ? 'text-white' : 'text-gray-900'
              } transition-colors duration-300`}
            >
              Your Cart is Empty
            </h1>
            <p
              className={`${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              } mb-6 transition-colors duration-300`}
            >
              You haven't added any items to your cart yet.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleGoBack}
                className={`px-4 py-2 rounded-md border ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                } transition-colors duration-300 flex items-center gap-2`}
              >
                <FaArrowLeft size={14} />
                <span>Go Back</span>
              </button>
              <Link
                href="/hotels"
                className={`px-4 py-2 rounded-md ${
                  darkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                } transition-colors duration-300`}
              >
                Browse Hotels
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle the checkout process
  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Verify we have a token
      if (!token) {
        throw new Error('Authentication token not available. Please log in again.');
      }

      // Prepare the booking data
      const bookingData = {
        paymentDetails: {
          cardNumber,
          cardExpiry,
          cardCvc,
          cardHolderName: cardName,
        },
        hotelBookings: cartItems
          .filter((item) => item.type === 'hotel')
          .map((item) => ({
            hotelId: item.hotelId,
            roomTypeId: item.roomTypeId,
            checkInDate: item.checkInDate,
            checkOutDate: item.checkOutDate,
            numberOfRooms: item.numberOfRooms,
          })),
        flightBookings: cartItems
          .filter((item) => item.type === 'flight')
          .map((item) => ({
            itineraryId: item.itineraryId,
            origin: item.origin,
            destination: item.destination,
            departureDate: item.departureDate,
            returnDate: item.returnDate,
            passengers: item.passengers,
            flights: item.flights,
            tripType: item.tripType,
            isReturn: item.isReturn,
          })),
      };

      console.log('Making booking request with authorization token');

      // Send the booking request to your API with the Authorization header
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      // Handle the response
      const data = await response.json();

      if (!response.ok) {
        console.error('Booking API error:', data);
        throw new Error(data.error || 'Failed to process booking');
      }

      console.log('Booking successful:', data.id);

      // Clear the cart and redirect to booking confirmation
      clearCart();
      router.push(`/bookings/${data.id}`);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Format card expiry date
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');

    if (v.length <= 2) {
      return v;
    }

    return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      } pb-12 transition-colors duration-300`}
    >
      {/* Navigation bar */}
      <nav
        className={`${
          darkMode ? 'bg-gray-800 shadow-md' : 'bg-white shadow-md'
        } transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link
                  href="/"
                  className={`text-2xl font-bold ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  } transition-colors duration-300`}
                >
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
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
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
                    <div
                      className={`px-4 py-3 border-b ${
                        darkMode ? 'border-gray-700' : 'border-gray-100'
                      } transition-colors duration-300`}
                    >
                      <p
                        className={`text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        } transition-colors duration-300`}
                      >
                        Signed in as
                      </p>
                      <p
                        className={`text-sm font-medium truncate ${
                          darkMode ? 'text-gray-200' : 'text-gray-800'
                        } transition-colors duration-300`}
                      >
                        {user.email}
                      </p>
                    </div>

                    <Link
                      href="/profile"
                      className={`block px-4 py-2 text-sm ${
                        darkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors duration-300 flex items-center gap-2`}
                    >
                      <FaUser size={14} />
                      <span>Profile</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className={`block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2 ${
                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      } transition-colors duration-300`}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className={`flex items-center gap-2 ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'
            } transition-colors duration-300`}
          >
            <FaArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        <div className="text-center">
          <h1
            className={`text-3xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            } mb-2 transition-colors duration-300`}
          >
            Checkout
          </h1>
          <p
            className={`${
              darkMode ? 'text-gray-300' : 'text-gray-600'
            } mb-8 transition-colors duration-300`}
          >
            Complete your booking
          </p>
        </div>

        {/* Auth status indicator */}
        {!token && (
          <div
            className={`mb-6 mx-auto max-w-3xl ${
              darkMode
                ? 'bg-yellow-900/30 border-yellow-800 text-yellow-200'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700'
            } p-4 rounded-md flex items-start border transition-colors duration-300`}
          >
            <FaExclamationTriangle
              className={`${
                darkMode ? 'text-yellow-400' : 'text-yellow-500'
              } mr-3 mt-1 flex-shrink-0 transition-colors duration-300`}
            />
            <div>
              <h3
                className={`font-medium ${
                  darkMode ? 'text-yellow-200' : 'text-yellow-800'
                } transition-colors duration-300`}
              >
                Authentication required
              </h3>
              <p
                className={`text-sm ${
                  darkMode ? 'text-yellow-300' : 'text-yellow-700'
                } transition-colors duration-300`}
              >
                Retrieving your authentication details... If this message persists, please try
                logging out and back in.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div
              className={`${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } p-6 rounded-lg shadow-md mb-6 transition-colors duration-300`}
            >
              <h2
                className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } mb-4 transition-colors duration-300`}
              >
                Order Summary
              </h2>

              <div
                className={`divide-y ${
                  darkMode ? 'divide-gray-700' : 'divide-gray-200'
                } transition-colors duration-300`}
              >
                {cartItems.map((item) => (
                  <div key={item.id} className="py-4">
                    {item.type === 'hotel' && (
                      <div className="flex justify-between">
                        <div>
                          <h3
                            className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            } transition-colors duration-300`}
                          >
                            {item.hotelName}
                          </h3>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            {item.roomTypeName}
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            {format(new Date(item.checkInDate), 'MMM dd, yyyy')} -{' '}
                            {format(new Date(item.checkOutDate), 'MMM dd, yyyy')}
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            {item.numberOfRooms} room(s) ×{' '}
                            {differenceInDays(
                              new Date(item.checkOutDate),
                              new Date(item.checkInDate)
                            )}{' '}
                            night(s)
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <p
                            className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            } transition-colors duration-300`}
                          >
                            ${item.totalPrice.toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 mt-2 transition-colors duration-300"
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {item.type === 'flight' && (
                      <div className="flex justify-between">
                        <div>
                          <h3
                            className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            } transition-colors duration-300`}
                          >
                            {item.tripType === 'one-way' ? 'One-way Flight' : 'Round-trip Flight'}
                          </h3>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            {item.origin} → {item.destination}
                            {item.isReturn && ' (Return)'}
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            {format(new Date(item.departureDate), 'MMM dd, yyyy')}
                            {item.tripType === 'round-trip' &&
                              ` - ${format(new Date(item.returnDate), 'MMM dd, yyyy')}`}
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            Departure: {format(parseISO(item.departureTime), 'h:mm a')}
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            Duration: {Math.floor(item.duration / 60)}h {item.duration % 60}m
                          </p>
                          <p
                            className={`text-sm ${
                              darkMode ? 'text-gray-300' : 'text-gray-600'
                            } transition-colors duration-300`}
                          >
                            Passengers: {item.passengers}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <p
                            className={`font-medium ${
                              darkMode ? 'text-white' : 'text-gray-900'
                            } transition-colors duration-300`}
                          >
                            ${(item.totalPrice * item.passengers).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 mt-2 transition-colors duration-300"
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className={`border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                } mt-4 pt-4 transition-colors duration-300`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    } transition-colors duration-300`}
                  >
                    Total
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      darkMode ? 'text-blue-400' : 'text-blue-600'
                    } transition-colors duration-300`}
                  >
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={clearCart}
                className={`mt-4 text-sm text-red-500 hover:text-red-700 transition-colors duration-300`}
              >
                <FaTrashAlt size={14} className="mr-1" />
                Clear Cart
              </button>
            </div>
          </div>

          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div
              className={`${
                darkMode ? 'bg-gray-800' : 'bg-white'
              } p-6 rounded-lg shadow-md transition-colors duration-300`}
            >
              <h2
                className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                } mb-4 flex items-center transition-colors duration-300`}
              >
                <FaLock className="text-green-600 mr-2" />
                Payment Information
              </h2>

              {error && (
                <div
                  className={`mb-6 p-4 ${
                    darkMode ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
                  } rounded-md transition-colors duration-300`}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout}>
                <div className="mb-6">
                  <label
                    className={`block text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1 transition-colors duration-300`}
                    htmlFor="card-name"
                  >
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className={`w-full px-3 py-2 border ${
                      darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300`}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label
                    className={`block text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    } mb-1 transition-colors duration-300`}
                    htmlFor="card-number"
                  >
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="card-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className={`w-full px-3 py-2 pl-10 border ${
                        darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                      } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300`}
                      placeholder="1234 5678 9012 3456"
                      maxLength="19"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FaCreditCard className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`} />
                    </div>
                    <div
                      className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      } mt-1 transition-colors duration-300`}
                    >
                      For testing, you can use: 4111 1111 1111 1111
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      } mb-1 transition-colors duration-300`}
                      htmlFor="expiry"
                    >
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      className={`w-full px-3 py-2 border ${
                        darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                      } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300`}
                      placeholder="MM/YY"
                      maxLength="5"
                      required
                    />
                    <div
                      className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      } mt-1 transition-colors duration-300`}
                    >
                      For testing: 12/99
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      } mb-1 transition-colors duration-300`}
                      htmlFor="cvc"
                    >
                      CVC
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className={`w-full px-3 py-2 border ${
                        darkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-300 bg-white text-gray-900'
                      } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300`}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                    <div
                      className={`text-xs ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      } mt-1 transition-colors duration-300`}
                    >
                      For testing: 123
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className={`w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      loading || !token ? 'opacity-70 cursor-not-allowed' : ''
                    } transition-colors duration-300`}
                  >
                    {loading ? 'Processing...' : `Complete Booking - $${cartTotal.toFixed(2)}`}
                  </button>
                </div>

                <p
                  className={`text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  } mt-4 text-center transition-colors duration-300`}
                >
                  By completing this booking, you agree to our terms and conditions.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
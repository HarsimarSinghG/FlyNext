'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  FaUser, FaEnvelope, FaPhone, FaIdCard, FaCamera, FaSpinner, FaCheck, 
  FaExclamationCircle, FaSignOutAlt, FaMoon, FaSun, FaArrowLeft
} from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import CartDropdown from '@/components/CartDropdown';

export default function ProfilePage() {
  const { user, logout, loading: authLoading, initialized, updateUserData } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    passportNumber: '',
    profilePictureUrl: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
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

  // Only redirect if auth is initialized and user is not logged in
  useEffect(() => {
    if (initialized && !user && !authLoading) {
      router.push('/login');
    }
  }, [initialized, user, authLoading, router]);

  // Fetch profile data after checking auth status
  useEffect(() => {
    if (user && initialized) {
      fetchUserProfile();
    }
  }, [user, initialized]);

  const handleTokenExpired = async () => {
    setRedirecting(true);
    await logout();
    
    // Add a small delay before redirecting for better UX
    setTimeout(() => {
      router.push('/login?expired=true');
    }, 1500);
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('No access token found');
      }
      
      const response = await fetch('/api/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        // If token is expired or invalid, redirect to login
        if (response.status === 401) {
          const data = await response.json();
          if (data.error === 'Token expired') {
            await handleTokenExpired();
            return;
          }
          await logout();
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfileData({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        email: data.user.email || '',
        phoneNumber: data.user.phoneNumber || '',
        passportNumber: data.user.passportNumber || '',
        profilePictureUrl: data.user.profilePictureUrl || ''
      });
      
      if (data.user.profilePictureUrl) {
        setImagePreview(data.user.profilePictureUrl);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file (PNG, JPG, JPEG)');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setImageFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;

    // Create form data for image upload
    const formData = new FormData();
    formData.append('file', imageFile);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const data = await response.json();
        // Check for token expiration
        if (response.status === 401 && data.error === 'Token expired') {
          await handleTokenExpired();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error(err.message || 'Failed to upload profile image');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      let profilePictureUrl = profileData.profilePictureUrl;
      
      // If there's a new image, upload it first
      if (imageFile) {
        profilePictureUrl = await uploadImage();
      }

      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          ...profileData,
          profilePictureUrl
        })
      });

      if (!response.ok) {
        const data = await response.json();
        // Check for token expiration
        if (response.status === 401 && data.error === 'Token expired') {
          await handleTokenExpired();
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(data.error || 'Failed to update profile');
      }

      const data = await response.json();
      
      // Update local state with the updated user data
      setProfileData({
        ...data.user,
        profilePictureUrl: data.user.profilePictureUrl || ''
      });
      
      // Also update the user in the auth context
      updateUserData({
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        profilePictureUrl: data.user.profilePictureUrl
      });
      
      setSuccess(true);
      
      // Reset image file state
      setImageFile(null);
      
      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleGoBack = () => {
    router.back();
  };

  if (authLoading || !initialized) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex justify-center items-center transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-700'} flex flex-col justify-center items-center transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Your session has expired.</p>
        <p className={`text-md ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2 transition-colors duration-300`}>Redirecting to login page...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex justify-center items-center transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
                <button
                  ref={userButtonRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                    darkMode 
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  } transition-colors duration-300`}
                >
                  {profileData.profilePictureUrl ? (
                    <div className="h-8 w-8 rounded-full overflow-hidden">
                      <Image 
                        src={profileData.profilePictureUrl} 
                        alt="Profile picture"
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <FaUser />
                  )}
                  <span>{profileData.firstName || 'Account'}</span>
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
                      <p className={`text-sm font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'} transition-colors duration-300`}>{profileData.email}</p>
                    </div>
                    
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
            </div>
          </div>
        </div>
      </nav>

      <div className={`pt-8 pb-12 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <div className="mb-8 flex items-center">
            <button 
              onClick={handleGoBack} 
              className={`flex items-center gap-2 ${
                darkMode
                ? 'text-gray-300 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
              } transition-colors duration-300`}
            >
              <FaArrowLeft />
              <span>Back</span>
            </button>
          </div>

          {/* Profile card */}
          <div className={`${
            darkMode
            ? 'bg-gray-800 shadow-lg'
            : 'bg-white shadow'
          } overflow-hidden sm:rounded-lg transition-colors duration-300`}>
            <div className={`px-4 py-5 sm:px-6 ${
              darkMode
              ? 'border-b border-gray-700'
              : 'border-b border-gray-200'
            } transition-colors duration-300`}>
              <h2 className={`text-2xl font-bold ${
                darkMode
                ? 'text-white'
                : 'text-gray-900'
              } transition-colors duration-300`}>Profile</h2>
              <p className={`mt-1 max-w-2xl text-sm ${
                darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              } transition-colors duration-300`}>
                Personal details and preferences
              </p>
            </div>

            {error && (
              <div className={`mx-4 mb-6 p-4 ${
                darkMode
                ? 'bg-red-900/20 border-l-4 border-red-700 text-red-400'
                : 'bg-red-50 border-l-4 border-red-500 text-red-700'
              } transition-colors duration-300`}>
                <div className="flex items-center">
                  <FaExclamationCircle className="mr-2" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className={`mx-4 mb-6 p-4 ${
                darkMode
                ? 'bg-green-900/20 border-l-4 border-green-700 text-green-400'
                : 'bg-green-50 border-l-4 border-green-500 text-green-700'
              } transition-colors duration-300`}>
                <div className="flex items-center">
                  <FaCheck className="mr-2" />
                  <p className="text-sm">Profile updated successfully!</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-6 px-4 py-5 sm:p-6">
                {/* Profile Image Section */}
                <div className="sm:col-span-6 flex flex-col items-center">
                  <div 
                    className={`relative h-32 w-32 rounded-full overflow-hidden ${
                      darkMode
                      ? 'bg-gray-700 border-4 border-gray-700'
                      : 'bg-gray-100 border-4 border-white'
                    } shadow-lg cursor-pointer group transition-colors duration-300`}
                    onClick={handleImageClick}
                  >
                    {imagePreview ? (
                      <div className="h-full w-full relative">
                        <Image 
                          src={imagePreview} 
                          alt="Profile picture" 
                          layout="fill" 
                          objectFit="cover"
                          className="group-hover:opacity-80 transition-opacity"
                        />
                      </div>
                    ) : (
                      <div className={`h-full w-full flex items-center justify-center ${
                        darkMode
                        ? 'bg-gray-600'
                        : 'bg-gray-200'
                      } transition-colors duration-300`}>
                        <FaUser className={`h-16 w-16 ${
                          darkMode
                          ? 'text-gray-400'
                          : 'text-gray-400'
                        }`} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <FaCamera className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleImageClick}
                    className={`mt-2 text-sm font-medium ${
                      darkMode
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-500'
                    } transition-colors duration-300`}
                  >
                    Change profile picture
                  </button>
                </div>

                {/* Form Fields */}
                <div className="sm:col-span-3">
                  <label htmlFor="firstName" className={`block text-sm font-medium ${
                    darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                  } transition-colors duration-300`}>
                    First name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className={`${
                        darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      } transition-colors duration-300`} />
                    </div>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={profileData.firstName}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                        : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      } transition-colors duration-300`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="lastName" className={`block text-sm font-medium ${
                    darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                  } transition-colors duration-300`}>
                    Last name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className={`${
                        darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      } transition-colors duration-300`} />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={profileData.lastName}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                        : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      } transition-colors duration-300`}
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="email" className={`block text-sm font-medium ${
                    darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                  } transition-colors duration-300`}>
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaEnvelope className={`${
                        darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      } transition-colors duration-300`} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={profileData.email}
                      disabled
                      className={`block w-full pl-10 pr-3 py-2 rounded-md border ${
                        darkMode 
                        ? 'bg-gray-600 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 border-gray-300 text-gray-500'
                      } transition-colors duration-300`}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${
                    darkMode
                    ? 'text-gray-400'
                    : 'text-gray-500'
                  } transition-colors duration-300`}>Your email address cannot be changed</p>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="phoneNumber" className={`block text-sm font-medium ${
                    darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                  } transition-colors duration-300`}>
                    Phone number
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaPhone className={`${
                        darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      } transition-colors duration-300`} />
                    </div>
                    <input
                      type="tel"
                      name="phoneNumber"
                      id="phoneNumber"
                      value={profileData.phoneNumber || ''}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                        : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      } transition-colors duration-300`}
                      placeholder="+1 (555) 987-6543"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="passportNumber" className={`block text-sm font-medium ${
                    darkMode
                    ? 'text-gray-300'
                    : 'text-gray-700'
                  } transition-colors duration-300`}>
                    Passport number (optional)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaIdCard className={`${
                        darkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      } transition-colors duration-300`} />
                    </div>
                    <input
                      type="text"
                      name="passportNumber"
                      id="passportNumber"
                      value={profileData.passportNumber || ''}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:ring-offset-gray-900 focus:border-blue-500' 
                        : 'border border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                      } transition-colors duration-300`}
                      placeholder="For faster booking"
                    />
                  </div>
                </div>
              </div>
              
              <div className={`px-4 py-3 ${
                darkMode
                ? 'bg-gray-800'
                : 'bg-gray-50'
              } text-right sm:px-6 flex justify-end items-center border-t ${
                darkMode
                ? 'border-gray-700' 
                : 'border-gray-200'
              } transition-colors duration-300`}>
                {saving && <FaSpinner className={`animate-spin ${
                  darkMode
                  ? 'text-blue-400'
                  : 'text-blue-600'
                } mr-2 transition-colors duration-300`} />}
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    saving 
                    ? 'opacity-70 cursor-not-allowed'
                    : darkMode
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account settings section */}
          <div className={`mt-8 ${
            darkMode
            ? 'bg-gray-800 shadow-lg'
            : 'bg-white shadow'
          } overflow-hidden sm:rounded-lg transition-colors duration-300`}>
            <div className={`px-4 py-5 sm:px-6 ${
              darkMode
              ? 'border-b border-gray-700'
              : 'border-b border-gray-200'
            } transition-colors duration-300`}>
              <h2 className={`text-xl font-semibold ${
                darkMode
                ? 'text-white'
                : 'text-gray-900'
              } transition-colors duration-300`}>Account Settings</h2>
              <p className={`mt-1 text-sm ${
                darkMode
                ? 'text-gray-400'
                : 'text-gray-500'
              } transition-colors duration-300`}>Manage your account preferences</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {/* Password change section */}
              <div className={`mb-6 pb-6 ${
                darkMode
                ? 'border-b border-gray-700'
                : 'border-b border-gray-200'
              } transition-colors duration-300`}>
                <h3 className={`text-lg font-medium ${
                  darkMode
                  ? 'text-gray-200'
                  : 'text-gray-900'
                } transition-colors duration-300`}>Change Password</h3>
                <p className={`mt-1 text-sm ${
                  darkMode
                  ? 'text-gray-400'
                  : 'text-gray-500'
                } mb-4 transition-colors duration-300`}>Update your password to keep your account secure</p>
                <button 
                  type="button" 
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    darkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300`}
                >
                  Change password
                </button>
              </div>
              
              {/* Delete account section */}
              <div>
                <h3 className={`text-lg font-medium ${
                  darkMode
                  ? 'text-red-400'
                  : 'text-red-600'
                } transition-colors duration-300`}>Delete Account</h3>
                <p className={`mt-1 text-sm ${
                  darkMode
                  ? 'text-gray-400'
                  : 'text-gray-500'
                } mb-4 transition-colors duration-300`}>
                  Once you delete your account, all of your data will be permanently removed.
                  This action cannot be undone.
                </p>
                <button 
                  type="button" 
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    darkMode
                    ? 'bg-red-900 text-red-100 hover:bg-red-800'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-300`}
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaHotel, FaMapMarkerAlt, FaImages, FaInfo, FaStar, FaUpload, FaCamera } from 'react-icons/fa';

// Dynamically import the map component to avoid SSR issues
const MapPicker = dynamic(
  () => import('@/components/MapPicker'),
  { ssr: false }
);

function CreateHotelPageContent() {
  const { user, initialized, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  // Form state - only using fields from the schema
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    starRating: 3,
    logoUrl: '',
    images: []
  });
  
  // Store actual files for upload
  const [imageFiles, setImageFiles] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Add state for address suggestions and search
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs for file inputs and debounced search
  const logoInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const searchTimeout = useRef(null);

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

  // Handle authentication check
  useEffect(() => {
    // Only redirect after auth is initialized and if user is not logged in
    if (initialized && !user) {
      router.push('/login?redirect=/hotel-management/create');
    }
  }, [user, initialized, router]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle address search and geocoding with Nominatim
  const handleAddressSearch = (value) => {
    // Update the form data first
    setFormData(prev => ({
      ...prev,
      address: value
    }));
    
    // Clear previous timeout if exists
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // If value is too short, don't search
    if (!value || value.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    
    // Set a timeout to avoid excessive API calls
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use Nominatim for geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=5`
        );
        
        if (!response.ok) throw new Error('Geocoding failed');
        
        const data = await response.json();
        setAddressSuggestions(data || []);
      } catch (err) {
        console.error('Error searching address:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };
  
  // Select an address from suggestions
  const selectAddress = (place) => {
    setFormData(prev => ({
      ...prev,
      address: place.display_name,
      latitude: place.lat,
      longitude: place.lon
    }));
    
    setAddressSuggestions([]);
  };
  
  // Handle map click to set coordinates
  const handleMapClick = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lng.toString()
    }));
    
    // Optionally, you can do reverse geocoding to get the address
    fetchAddressFromCoordinates(lat, lng);
  };
  
  // Reverse geocoding to get address from coordinates
  const fetchAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Reverse geocoding failed');
      
      const data = await response.json();
      
      if (data && data.display_name) {
        setFormData(prev => ({
          ...prev,
          address: data.display_name
        }));
      }
    } catch (err) {
      console.error('Error getting address from coordinates:', err);
    }
  };

  // Handle logo selection
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file (size and type)
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      const maxSize = 2 * 1024 * 1024; // 2MB
      
      if (!validTypes.includes(file.type)) {
        setError(`Logo file is not a supported image type. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }
      
      if (file.size > maxSize) {
        setError(`Logo file is too large. Maximum size is 2MB.`);
        return;
      }
      
      setLogoFile(file);
      setFormData(prev => ({
        ...prev,
        logoUrl: URL.createObjectURL(file)
      }));
      setError('');
    }
  };

  // Handle image selection
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files (size and type)
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        setError(`File "${file.name}" is not a supported image type. Please use JPEG, PNG, GIF, or WebP.`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length !== files.length) {
      return; // Don't proceed if some files were invalid
    }
    
    setError('');
    setImageFiles(validFiles);
    
    // Create object URLs for preview
    setFormData(prev => ({
      ...prev,
      images: validFiles.map(file => URL.createObjectURL(file))
    }));
  };

  // Function to upload a single image
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to upload ${file.name}`);
    }
    
    const data = await response.json();
    return data.url;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setUploadProgress(0);

    try {
      // Upload logo if provided
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadImage(logoFile);
      }
      
      // Upload all images
      const imageUrls = [];
      
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const url = await uploadImage(imageFiles[i]);
          imageUrls.push(url);
          
          // Update progress
          setUploadProgress(Math.round((i + 1) / imageFiles.length * 100));
        }
      }

      // Create hotel with uploaded image URLs - strictly following schema
      const hotelData = {
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        starRating: parseInt(formData.starRating) || 3,
        logoUrl: logoUrl,
        images: imageUrls,  // This will be converted to JSON in the API
        ownerId: user.id    // Make sure to include the owner ID
      };

      console.log("Sending hotel data:", hotelData);

      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(hotelData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create hotel');
      }

      const newHotel = await response.json();
      setSuccess('Hotel created successfully! Redirecting to hotel dashboard...');
      
      // Wait a moment before redirecting for better UX
      setTimeout(() => {
        router.push(`/hotel-management/${newHotel.id}`);
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Tabs for organization
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: <FaInfo className="mr-2" /> },
    { id: 'location', label: 'Location', icon: <FaMapMarkerAlt className="mr-2" /> },
    { id: 'images', label: 'Images', icon: <FaImages className="mr-2" /> }
  ];

  // Show loading state while auth is being initialized
  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Don't render the form if user is not logged in (useEffect will handle redirect)
  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaHotel className="mr-2" /> 
                Create New Hotel
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
        <div className="mb-6 flex flex-wrap gap-2">
          <Link 
            href="/hotel-management"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            Back to Hotels
          </Link>
        </div>

        {error && (
          <div className={`${darkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-800'} border px-6 py-4 rounded-md mb-6`}>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className={`${darkMode ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-800'} border px-6 py-4 rounded-md mb-6`}>
            <p>{success}</p>
          </div>
        )}

        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg overflow-hidden border`}>
          {/* Tabs Navigation */}
          <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap flex items-center transition-colors duration-300 ${
                    activeTab === tab.id
                      ? darkMode 
                        ? 'border-b-2 border-blue-500 text-blue-400 bg-gray-700/50' 
                        : 'border-b-2 border-blue-500 text-blue-600'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div>
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaInfo className="mr-2 text-blue-500" /> Basic Information
                </h2>

                <div className="mb-6">
                  <label htmlFor="name" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                    Hotel Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    placeholder="Enter hotel name"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="starRating" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                    Star Rating *
                  </label>
                  <div className="relative">
                    <select
                      id="starRating"
                      name="starRating"
                      required
                      value={formData.starRating}
                      onChange={handleChange}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 pr-8 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      <option value="1" className={darkMode ? "bg-gray-700" : ""}>1 Star</option>
                      <option value="2" className={darkMode ? "bg-gray-700" : ""}>2 Stars</option>
                      <option value="3" className={darkMode ? "bg-gray-700" : ""}>3 Stars</option>
                      <option value="4" className={darkMode ? "bg-gray-700" : ""}>4 Stars</option>
                      <option value="5" className={darkMode ? "bg-gray-700" : ""}>5 Stars</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <FaStar />
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <label htmlFor="logoUrl" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                    Hotel Logo (Optional)
                  </label>
                  <div className={`mt-2 p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${
                    darkMode 
                      ? 'border-gray-600 hover:border-blue-500 bg-gray-700/30' 
                      : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                  }`}>
                    <input
                      type="file"
                      id="logoUrl"
                      name="logoUrl"
                      ref={logoInputRef}
                      accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current.click()}
                      className="w-full flex flex-col items-center cursor-pointer py-3"
                    >
                      <FaUpload className={`mb-2 h-8 w-8 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Click to upload a logo
                      </span>
                      <span className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        JPEG, PNG, GIF, WebP (max 2MB)
                      </span>
                    </button>
                  </div>
                  
                  {formData.logoUrl && (
                    <div className="mt-4">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Logo preview:</p>
                      <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg inline-block relative group`}>
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo Preview" 
                          className="h-20 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setFormData(prev => ({
                              ...prev,
                              logoUrl: ''
                            }));
                          }}
                          className={`absolute -top-2 -right-2 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${
                            darkMode ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-white text-red-500 hover:bg-red-50'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div>
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaMapMarkerAlt className="mr-2 text-blue-500" /> Location Information
                </h2>
                
                <div className="mb-6 relative">
                  <label htmlFor="address" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                    Address *
                  </label>
                  <div className="relative">
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 pr-10 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                      placeholder="Search for hotel address"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-2">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Address suggestions dropdown */}
                  {addressSuggestions.length > 0 && (
                    <div className={`absolute z-10 mt-1 w-full rounded-md border max-h-60 overflow-auto shadow-lg ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      {addressSuggestions.map((place) => (
                        <button
                          key={place.place_id}
                          type="button"
                          onClick={() => selectAddress(place)}
                          className={`w-full text-left px-4 py-2 focus:outline-none ${
                            darkMode 
                              ? 'hover:bg-gray-600 focus:bg-gray-600 text-white' 
                              : 'hover:bg-gray-100 focus:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {place.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Map component */}
                <div className="mb-6">
                  <label className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                    Select Location on Map
                  </label>
                  <div className={`h-[400px] w-full rounded-lg overflow-hidden border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <MapPicker
                      latitude={parseFloat(formData.latitude) || 43.6532}
                      longitude={parseFloat(formData.longitude) || -79.3832}
                      onPositionChange={handleMapClick}
                      darkMode={darkMode} // Pass darkMode prop if your component supports it
                    />
                  </div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                    Click on the map to set the exact location of your hotel
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label htmlFor="latitude" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                      Latitude *
                    </label>
                    <input
                      id="latitude"
                      name="latitude"
                      type="text"
                      required
                      value={formData.latitude}
                      onChange={handleChange}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                      placeholder="e.g. 43.6532"
                    />
                  </div>
                  <div>
                    <label htmlFor="longitude" className={`block ${darkMode ? 'text-gray-300' : 'text-gray-700'} text-sm font-bold mb-2`}>
                      Longitude *
                    </label>
                    <input
                      id="longitude"
                      name="longitude"
                      type="text"
                      required
                      value={formData.longitude}
                      onChange={handleChange}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                      placeholder="e.g. -79.3832"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div>
                <h2 className={`text-xl font-semibold mb-6 flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <FaImages className="mr-2 text-blue-500" /> Hotel Images
                </h2>
                
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mb-6`}>
                  Upload high-quality images of your hotel. Good photos increase bookings!
                </p>
                
                <div className={`mt-2 p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${
                  darkMode 
                    ? 'border-gray-600 hover:border-blue-500 bg-gray-700/30' 
                    : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                }`}>
                  <input
                    type="file"
                    id="images"
                    name="images"
                    ref={imageInputRef}
                    multiple
                    accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button 
                    type="button" 
                    onClick={() => imageInputRef.current.click()}
                    className="w-full flex flex-col items-center cursor-pointer py-6"
                  >
                    <FaCamera className={`h-14 w-14 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                    <p className={`mt-2 text-lg font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      Click to upload images
                    </p>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      PNG, JPG, GIF, WebP up to 5MB each
                    </p>
                    <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      You can upload multiple images at once
                    </p>
                  </button>
                </div>

                {/* Image Previews */}
                {formData.images.length > 0 && (
                  <div className="mt-8">
                    <h3 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Selected Images
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className={`aspect-w-16 aspect-h-9 overflow-hidden rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <img
                              src={image}
                              alt={`Preview ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...formData.images];
                              newImages.splice(index, 1);
                              setFormData(prev => ({ ...prev, images: newImages }));
                              
                              const newImageFiles = [...imageFiles];
                              newImageFiles.splice(index, 1);
                              setImageFiles(newImageFiles);
                            }}
                            className={`absolute top-2 right-2 rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none ${
                              darkMode 
                                ? 'bg-gray-800 text-white hover:bg-red-700' 
                                : 'bg-white text-red-500 hover:bg-red-100'
                            }`}
                            aria-label="Remove image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Upload Progress */}
                {loading && uploadProgress > 0 && (
                  <div className="mt-6">
                    <h3 className={`text-md font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Uploading Images...
                    </h3>
                    <div className={`bg-gray-200 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                      {uploadProgress}% complete
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button - Visible on all tabs */}
            <div className={`mt-8 pt-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Link
                  href="/hotel-management"
                  className={`py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } transition-colors duration-300`}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors duration-300 ${
                    loading
                      ? (darkMode ? 'bg-blue-700/50' : 'bg-blue-400') + ' cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating...
                    </div>
                  ) : (
                    'Create Hotel'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreateHotelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel creation form...</p>
        </div>
      </div>
    }>
      <CreateHotelPageContent />
    </Suspense>
  );
}
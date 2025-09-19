"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaHotel, FaMapMarkerAlt, FaImages, FaInfo, FaStar, FaUpload, FaCamera } from 'react-icons/fa';

// Dynamically import the map component to avoid SSR issues
const MapPicker = dynamic(
  () => import('@/components/MapPicker'),
  { ssr: false }
);

function EditHotelContent() {
  const { hotelId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initialized, logout } = useAuth();
  
  // State for form data - only using fields from the schema
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    starRating: 3,
    logoUrl: '',
    images: []
  });

  // State for UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [imageUploads, setImageUploads] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Add a state for address suggestions
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced address search
  const searchTimeout = useRef(null);
  const logoInputRef = useRef(null);
  const imageInputRef = useRef(null);

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

  // Fetch hotel data on component mount
  useEffect(() => {
    if (initialized && !user) {
      router.push('/login');
      return;
    }

    if (initialized && user) {
      fetchHotelData();
    }
  }, [initialized, user, hotelId, router]);

  // Handle unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle image preview
  useEffect(() => {
    if (imageUploads.length > 0) {
      const newPreviews = [];

      for (let i = 0; i < imageUploads.length; i++) {
        const file = imageUploads[i];
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);
      }

      setPreviewUrls(newPreviews);

      return () => {
        newPreviews.forEach(url => URL.revokeObjectURL(url));
      };
    }
  }, [imageUploads]);

  // Fetch hotel data
  const fetchHotelData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/hotels/${hotelId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch hotel data');
      }
      
      const hotelData = await response.json();
      
      // Parse images - they could be a string or already an array
      let imagesArray = [];
      if (hotelData.images) {
        try {
          if (typeof hotelData.images === 'string') {
            imagesArray = JSON.parse(hotelData.images);
          } else {
            imagesArray = hotelData.images;
          }
        } catch (e) {
          console.error("Error parsing images:", e);
          imagesArray = [];
        }
      }
      
      // Initialize form with fetched data - match the schema
      setFormData({
        name: hotelData.name || '',
        address: hotelData.address || '',
        latitude: hotelData.latitude?.toString() || '',
        longitude: hotelData.longitude?.toString() || '',
        starRating: hotelData.starRating || 3,
        logoUrl: hotelData.logoUrl || '',
        images: Array.isArray(imagesArray) ? imagesArray : []
      });
      
      setIsDirty(false);
    } catch (err) {
      console.error('Error fetching hotel data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    setIsDirty(true);
  };

  // Handle address search and geocoding with Nominatim
  const handleAddressSearch = (value) => {
    // Update the form data first
    setFormData(prev => ({
      ...prev,
      address: value
    }));
    
    setIsDirty(true);
    
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
    setIsDirty(true);
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
    
    setIsDirty(true);
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

  // Handle logo upload
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
      setIsDirty(true);
    }
  };

  // Handle image uploads
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files (size and type)
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!validTypes.includes(file.type)) {
        setError(`File "${file.name}" is not a supported image type.`);
        return false;
      }
      
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 5MB.`);
        return false;
      }
      
      return true;
    });
    
    setImageUploads(prev => [...prev, ...validFiles]);
    setIsDirty(true);
  };

  const handleRemoveImageUpload = (index) => {
    setImageUploads(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleRemoveExistingImage = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageUrl)
    }));
    setIsDirty(true);
  };

  // Upload images to server/cloud storage
  const uploadImages = async () => {
    const uploadedImageUrls = [];
    const token = localStorage.getItem('accessToken');
    
    // Upload logo if it's a new file
    if (logoFile) {
      try {
        const formData = new FormData();
        formData.append('file', logoFile);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload logo');
        }
        
        const data = await response.json();
        // We'll return this separately
        return { logoUrl: data.url, imageUrls: [] };
      } catch (err) {
        console.error('Error uploading logo:', err);
        setError('Failed to upload logo: ' + err.message);
        return { logoUrl: null, imageUrls: [] };
      }
    }
    
    // If no new images, return empty array
    if (imageUploads.length === 0) {
      return { logoUrl: null, imageUrls: [] };
    }
    
    // Upload all new images
    for (let i = 0; i < imageUploads.length; i++) {
      const file = imageUploads[i];
      
      try {
        setUploadProgress(prev => ({ ...prev, [i]: 0 }));
        
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload image
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to upload image: ${file.name}`);
        }
        
        const data = await response.json();
        uploadedImageUrls.push(data.url);
        
        // Update progress to complete
        setUploadProgress(prev => ({ ...prev, [i]: 100 }));
        
      } catch (err) {
        console.error('Error uploading image:', err);
        setUploadErrors(prev => ({ ...prev, [i]: err.message }));
      }
    }
    
    return { logoUrl: null, imageUrls: uploadedImageUrls };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage('');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Upload new images and logo first
      const { logoUrl: newLogoUrl, imageUrls: newImageUrls } = await uploadImages();
      
      // Determine final logo URL
      const finalLogoUrl = newLogoUrl || (logoFile ? null : formData.logoUrl);
      
      // Combine existing and new images
      const updatedImages = [...formData.images, ...newImageUrls];
      
      // Format data according to the Hotel schema
      const updateData = {
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        starRating: parseInt(formData.starRating) || 3,
        logoUrl: finalLogoUrl,
        images: updatedImages
      };
      
      console.log("Sending update data:", updateData);
      
      // Send update request
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("API error response:", responseData);
        throw new Error(responseData.error || responseData.message || 'Failed to update hotel');
      }
      
      // Reset state
      setSuccessMessage('Hotel information updated successfully!');
      setImageUploads([]);
      setLogoFile(null);
      setPreviewUrls([]);
      setUploadProgress({});
      setUploadErrors({});
      setIsDirty(false);
      
      // Reload the latest hotel data
      fetchHotelData();
      
    } catch (err) {
      console.error('Error updating hotel:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Tabs for organization - simplified to match the schema
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: <FaInfo className="mr-2" /> },
    { id: 'location', label: 'Location', icon: <FaMapMarkerAlt className="mr-2" /> },
    { id: 'images', label: 'Images', icon: <FaImages className="mr-2" /> }
  ];

  if (!initialized) {
    return (
      <div className={`min-h-screen flex justify-center items-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (initialized && !user) {
    return null; // Will redirect in useEffect
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <FaHotel className="mr-2" /> 
                  Edit Hotel
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
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading hotel information...</p>
          </div>
        </div>
      </div>
    );
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
                Edit Hotel
                {formData.name && <span className="ml-2">- {formData.name}</span>}
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
            href={`/hotel-management/${hotelId}`}
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaArrowLeft className="mr-2" />
            Back to Hotel Dashboard
          </Link>
          
          <Link 
            href="/hotel-management"
            className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-blue-600'} py-2 px-4 rounded-md flex items-center shadow-sm transition-colors duration-300`}
          >
            <FaHotel className="mr-2" />
            All Hotels
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
            <p>{successMessage}</p>
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
                    placeholder="Hotel name"
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
                  {formData.logoUrl && !logoFile && (
                    <div className="mb-4">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>Current logo:</p>
                      <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg inline-block`}>
                        <img 
                          src={formData.logoUrl} 
                          alt="Current Logo" 
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className={`mt-2 p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ${
                    darkMode 
                      ? 'border-gray-600 hover:border-blue-500 bg-gray-700/30' 
                      : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                  }`}>
                    <input
                      type="file"
                      id="logoUpload"
                      name="logoUpload"
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
                  
                  {logoFile && (
                    <div className="mt-4">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>New logo preview:</p>
                      <div className={`p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg inline-block relative group`}>
                        <img 
                          src={URL.createObjectURL(logoFile)} 
                          alt="New Logo Preview" 
                          className="h-20 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setFormData(prev => ({
                              ...prev,
                              logoUrl: prev.logoUrl === URL.createObjectURL(logoFile) ? '' : prev.logoUrl
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

                {/* Existing Images */}
                {formData.images.length > 0 && (
                  <div className="mb-8">
                    <h3 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Current Images
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {formData.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <div className={`aspect-w-16 aspect-h-9 overflow-hidden rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <img
                              src={imageUrl}
                              alt={`Hotel image ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(imageUrl)}
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

                {/* Image Upload */}
                <div className="mb-8">
                  <h3 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Upload New Images
                  </h3>
                  
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                      darkMode 
                        ? 'border-gray-600 hover:border-blue-500 bg-gray-700/30' 
                        : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                    }`}
                  >
                    <input
                      type="file"
                      id="image-upload"
                      ref={imageInputRef}
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
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
                    </button>
                  </div>
                </div>

                {/* Image Previews */}
                {previewUrls.length > 0 && (
                  <div>
                    <h3 className={`text-md font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Selected Images
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className={`aspect-w-16 aspect-h-9 overflow-hidden rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <img
                              src={url}
                              alt={`Upload preview ${index + 1}`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImageUpload(index)}
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
                          
                          {/* Progress Bar for Upload (will show during form submit) */}
                          {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                            <div className={`absolute inset-x-0 bottom-0 p-2 ${darkMode ? 'bg-gray-800 bg-opacity-75' : 'bg-white bg-opacity-75'}`}>
                              <div className={`h-1.5 w-full overflow-hidden rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div 
                                  className="h-full bg-blue-600 rounded-full" 
                                  style={{ width: `${uploadProgress[index]}%` }}
                                ></div>
                              </div>
                              <p className={`text-center text-xs mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {uploadProgress[index]}%
                              </p>
                            </div>
                          )}

                          {/* Upload Error */}
                          {uploadErrors[index] && (
                            <div className={`absolute inset-x-0 bottom-0 ${darkMode ? 'bg-red-900/80 text-red-200' : 'bg-red-100 text-red-800'} p-2 text-xs`}>
                              {uploadErrors[index]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button - Visible on all tabs */}
            <div className={`mt-8 pt-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Link
                  href={`/hotel-management/${hotelId}`}
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
                  disabled={isSaving || !isDirty}
                  className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white transition-colors duration-300 ${
                    isSaving || !isDirty
                      ? (darkMode ? 'bg-blue-700/50' : 'bg-blue-400') + ' cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
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

export default function EditHotel() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hotel editor...</p>
        </div>
      </div>
    }>
      <EditHotelContent />
    </Suspense>
  );
}
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { FaArrowLeft, FaSignOutAlt, FaMoon, FaSun, FaUpload, FaTrash, FaBed, FaPlus } from 'react-icons/fa';

export default function CreateRoomType() {
  const { hotelId } = useParams();
  const router = useRouter();
  const { user, initialized, logout } = useAuth();
  const fileInputRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [name, setName] = useState('');
  const [baseAvailability, setBaseAvailability] = useState(1);
  const [pricePerNight, setPricePerNight] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  
  // Amenities
  const [amenities, setAmenities] = useState({
    wifi: false,
    airConditioning: false,
    breakfast: false,
    tv: false,
    minibar: false,
    bathTub: false,
    balcony: false,
    freeParking: false,
    roomService: false,
    safeBox: false,
  });

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
      router.push('/login?redirect=/hotel-management');
    }
  }, [initialized, user, router]);

  const handleAmenityChange = (amenity) => {
    setAmenities({
      ...amenities,
      [amenity]: !amenities[amenity]
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

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
    setImageFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    // Create object URLs for preview
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreview(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    // Remove image preview and file
    const newPreviews = [...imagePreview];
    const newFiles = [...imageFiles];
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    newPreviews.splice(index, 1);
    newFiles.splice(index, 1);
    
    setImagePreview(newPreviews);
    setImageFiles(newFiles);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
    
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        router.push('/login');
        return;
      }

      let imageUrls = [];

      // Upload all images
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const url = await uploadImage(imageFiles[i]);
          imageUrls.push(url);
          
          // Update progress
          setUploadProgress(Math.round((i + 1) / imageFiles.length * 100));
        }
      }
      
      // Convert amenities object to array of strings
      const amenitiesList = Object.keys(amenities)
        .filter(key => amenities[key])
        .map(key => key.replace(/([A-Z])/g, ' $1').toLowerCase().trim());
      
      const response = await fetch(`/api/hotels/${hotelId}/room-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name,
          baseAvailability: parseInt(baseAvailability),
          pricePerNight: parseFloat(pricePerNight),
          images: imageUrls,
          amenities: amenitiesList
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room type');
      }
      
      setSuccess(true);
      
      // Reset form
      setName('');
      setBaseAvailability(1);
      setPricePerNight('');
      
      // Clear images and revoke URLs
      imagePreview.forEach(url => URL.revokeObjectURL(url));
      setImagePreview([]);
      setImageFiles([]);
      
      setAmenities({
        wifi: false,
        airConditioning: false,
        breakfast: false,
        tv: false,
        minibar: false,
        bathTub: false,
        balcony: false,
        freeParking: false,
        roomService: false,
        safeBox: false
      });
      
      // Redirect to room types list
      setTimeout(() => {
        router.push(`/hotel-management/${hotelId}/room-types`);
      }, 1500);
      
    } catch (err) {
      console.error('Error creating room type:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} transition-colors duration-300`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <FaPlus className="mr-2" /> Create New Room Type
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

      <div className="container mx-auto p-4 max-w-3xl">
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
            <FaBed className="mr-2" />
            Back to Hotel
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
            <p className="font-medium">Success!</p>
            <p>Room type created successfully. Redirecting...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-md rounded-lg p-6 border`}>
          <div className="mb-6">
            <label className={`block ${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="name">
              Room Type Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'} leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="e.g. Deluxe King Room"
            />
          </div>

          <div className="mb-6">
            <label className={`block ${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="baseAvailability">
              Base Availability (Number of Rooms) *
            </label>
            <input
              id="baseAvailability"
              type="number"
              min="1"
              value={baseAvailability}
              onChange={(e) => setBaseAvailability(e.target.value)}
              required
              className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'} leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
              This is the default number of rooms available for booking
            </p>
          </div>

          <div className="mb-6">
            <label className={`block ${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-bold mb-2`} htmlFor="pricePerNight">
              Price Per Night ($) *
            </label>
            <input
              id="pricePerNight"
              type="number"
              min="0"
              step="0.01"
              value={pricePerNight}
              onChange={(e) => setPricePerNight(e.target.value)}
              required
              className={`shadow appearance-none border rounded w-full py-2 px-3 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'} leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <div className="mb-6">
            <label className={`block ${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-bold mb-2`}>
              Room Amenities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(amenities).map((amenity) => (
                <div key={amenity} className="flex items-center">
                  <input
                    id={amenity}
                    type="checkbox"
                    checked={amenities[amenity]}
                    onChange={() => handleAmenityChange(amenity)}
                    className={`h-4 w-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded focus:ring-blue-500 text-blue-600`}
                  />
                  <label htmlFor={amenity} className={`ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'} capitalize`}>
                    {amenity.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className={`block ${darkMode ? 'text-gray-200' : 'text-gray-700'} text-sm font-bold mb-2`}>
              Room Images
            </label>
            
            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {imagePreview.map((preview, index) => (
                  <div 
                    key={`preview-${index}`} 
                    className={`relative group rounded-lg overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} h-36`}
                  >
                    <img 
                      src={preview} 
                      alt={`New image ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <button 
                        type="button"
                        onClick={() => removeImage(index)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors duration-200"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <div className="mt-4 mb-4">
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                  Uploading images... {uploadProgress}%
                </p>
              </div>
            )}
            
            {/* Image Upload Button */}
            <div className="mt-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-medium py-2 px-4 rounded-md inline-flex items-center transition-colors duration-300`}
              >
                <FaUpload className="mr-2" />
                Upload Images
              </button>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
                Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB per image.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-300 flex items-center justify-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></div>
                  Creating...
                </div>
              ) : (
                'Create Room Type'
              )}
            </button>
            <Link
              href={`/hotel-management/${hotelId}/room-types`}
              className={`w-full sm:w-auto ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'} font-bold py-2 px-6 rounded-md transition-colors duration-300 text-center`}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
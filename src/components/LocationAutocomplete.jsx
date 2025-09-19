'use client';
import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaPlane, FaCity } from 'react-icons/fa';

export default function LocationAutocomplete({ value, onChange, placeholder, label, id }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(value || null);
  const autocompleteRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Set display value when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      setQuery(selectedLocation.type === 'airport' ? 
        `${selectedLocation.city} (${selectedLocation.code})` : 
        `${selectedLocation.name}, ${selectedLocation.country}`);
    }
  }, [selectedLocation]);
  
  // Initialize from passed value if present
  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
    }
  }, [value]);
  
  // Search for locations when query changes
  const searchLocations = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/flights/locations?query=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
      } else {
        console.error('Error fetching locations:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Debounce search to avoid too many API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      searchLocations(query);
    }, 300);
    
    return () => {
      clearTimeout(handler);
    };
  }, [query]);
  
  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedLocation(null);
    if (value.length > 0) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
    
    // Call parent's onChange with null to indicate no selection
    onChange(null);
  };
  
  // Handle selection of a location
  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
    setShowResults(false);
    
    // Call parent's onChange with the selected location
    onChange(location);
  };
  
  return (
    <div className="relative w-full" ref={autocompleteRef}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 0 && setShowResults(true)}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {showResults && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
          ) : results.length > 0 ? (
            results.map((location) => (
              <div
                key={location.id}
                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                onClick={() => handleSelectLocation(location)}
              >
                <div className="flex items-center">
                  {location.type === 'airport' ? (
                    <FaPlane className="text-gray-400 mr-2 h-4 w-4" />
                  ) : (
                    <FaCity className="text-gray-400 mr-2 h-4 w-4" />
                  )}
                  <div>
                    <div className="font-medium">
                      {location.type === 'airport' ? (
                        <span>{location.city} ({location.code})</span>
                      ) : (
                        <span>{location.name}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {location.type === 'airport' ? (
                        <span>{location.name} • {location.country}</span>
                      ) : (
                        <span>{location.country}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">No locations found</div>
          )}
        </div>
      )}
    </div>
  );
}
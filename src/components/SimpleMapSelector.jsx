'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the LeafletMap component with no SSR
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full justify-center items-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
});

export default function SimpleMapSelector({ 
  initialLatitude, 
  initialLongitude, 
  initialAddress = '',
  onLocationSelected 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState('');
  
  const [selectedPosition, setSelectedPosition] = useState({
    lat: initialLatitude ? parseFloat(initialLatitude) : 43.6532,
    lng: initialLongitude ? parseFloat(initialLongitude) : -79.3832,
    address: initialAddress || ''
  });

  // Update position when props change
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      setSelectedPosition(prev => ({
        ...prev,
        lat: parseFloat(initialLatitude),
        lng: parseFloat(initialLongitude),
        address: initialAddress || prev.address
      }));
    }
  }, [initialLatitude, initialLongitude, initialAddress]);

  // Handle marker position change
  const handlePositionChange = async (position) => {
    setSelectedPosition(prev => ({
      ...prev,
      lat: position.lat,
      lng: position.lng
    }));
    
    // Get address from coordinates with OpenStreetMap's Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (!response.ok) throw new Error('Failed to get address');
      
      const data = await response.json();
      const address = data.display_name;
      
      setSelectedPosition(prev => ({
        ...prev,
        address: address
      }));
      
      if (onLocationSelected) {
        onLocationSelected({
          latitude: position.lat,
          longitude: position.lng,
          address: address
        });
      }
    } catch (error) {
      console.error('Error getting address:', error);
      // Even without an address, we still want to update the location
      if (onLocationSelected) {
        onLocationSelected({
          latitude: position.lat,
          longitude: position.lng,
          address: selectedPosition.address
        });
      }
    }
  };

  // Search for locations
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data);
      
      if (data.length === 0) {
        setError('No locations found for this address');
      }
    } catch (err) {
      setError('Error searching for location');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select a location from search results
  const handleSelectLocation = (location) => {
    const position = {
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon)
    };
    
    setSelectedPosition({
      lat: position.lat,
      lng: position.lng,
      address: location.display_name
    });
    
    if (onLocationSelected) {
      onLocationSelected({
        latitude: position.lat,
        longitude: position.lng,
        address: location.display_name
      });
    }
    
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for an address"
          className="flex-1 border border-gray-300 px-4 py-2 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSearching}
        >
          {isSearching ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </form>
      
      {error && (
        <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}
      
      {searchResults.length > 0 && (
        <div className="border rounded-md overflow-hidden bg-white shadow-md">
          <ul className="divide-y">
            {searchResults.map((location) => (
              <li 
                key={`${location.place_id}-${location.osm_id}`}
                className="p-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectLocation(location)}
              >
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-1 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm">{location.display_name}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {location.lat}, {location.lon}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="h-[400px] rounded-lg overflow-hidden border border-gray-300">
        <LeafletMap 
          position={[selectedPosition.lat, selectedPosition.lng]} 
          onPositionChange={handlePositionChange}
        />
      </div>
      
      {selectedPosition.address && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-1 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-medium text-blue-800">Selected Location</h3>
              <p className="text-sm text-gray-700">{selectedPosition.address}</p>
              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                <span>Lat: {selectedPosition.lat.toFixed(6)}</span>
                <span>Lng: {selectedPosition.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
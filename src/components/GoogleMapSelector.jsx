'use client';

import { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaSearch } from 'react-icons/fa';

export default function GoogleMapSelector({ 
  initialLatitude, 
  initialLongitude, 
  initialAddress, 
  onLocationSelected 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLatitude || 43.6532,  // Default to Toronto
    longitude: initialLongitude || -79.3832,
    address: initialAddress || ''
  });
  
  // Check if Google Maps API is loaded
  useEffect(() => {
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setIsMapLoaded(true);
      } else {
        // If not loaded yet, check again in 100ms
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };
    
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      checkGoogleMapsLoaded();
    }
    
    return () => {
      // Clean up any potential memory leaks
      if (map) {
        // Remove event listeners if needed
      }
    };
  }, []);
  
  // Initialize the map after confirming Google Maps is loaded
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || map) return;
    
    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: { 
          lat: parseFloat(selectedLocation.latitude), 
          lng: parseFloat(selectedLocation.longitude) 
        },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      
      setMap(mapInstance);
      
      // Create initial marker if coordinates exist
      if (selectedLocation.latitude && selectedLocation.longitude) {
        const position = {
          lat: parseFloat(selectedLocation.latitude),
          lng: parseFloat(selectedLocation.longitude)
        };
        
        const newMarker = new window.google.maps.Marker({
          position,
          map: mapInstance,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });
        
        setMarker(newMarker);
        
        // Handle marker drag end event
        newMarker.addListener('dragend', () => {
          const position = newMarker.getPosition();
          const lat = position.lat();
          const lng = position.lng();
          
          // Reverse geocode to get address from coordinates
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              
              setSelectedLocation({
                latitude: lat,
                longitude: lng,
                address
              });
              
              // Notify parent component
              onLocationSelected({
                latitude: lat,
                longitude: lng,
                address
              });
            }
          });
        });
      }
      
      // Add click event listener to map
      mapInstance.addListener('click', (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Update or create marker
        if (marker) {
          marker.setPosition({ lat, lng });
        } else {
          const newMarker = new window.google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            draggable: true,
            animation: window.google.maps.Animation.DROP,
          });
          
          setMarker(newMarker);
          
          // Handle marker drag end event
          newMarker.addListener('dragend', () => {
            const position = newMarker.getPosition();
            const lat = position.lat();
            const lng = position.lng();
            
            // Reverse geocode to get address from coordinates
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address;
                
                setSelectedLocation({
                  latitude: lat,
                  longitude: lng,
                  address
                });
                
                // Notify parent component
                onLocationSelected({
                  latitude: lat,
                  longitude: lng,
                  address
                });
              }
            });
          });
        }
        
        // Reverse geocode to get address from coordinates
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            
            setSelectedLocation({
              latitude: lat,
              longitude: lng,
              address
            });
            
            // Notify parent component
            onLocationSelected({
              latitude: lat,
              longitude: lng,
              address
            });
          }
        });
      });
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
    }
  }, [isMapLoaded, map, selectedLocation.latitude, selectedLocation.longitude, onLocationSelected]);
  
  // Handle search address
  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!searchQuery || !map || !isMapLoaded) return;
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        const latitude = lat();
        const longitude = lng();
        const address = results[0].formatted_address;
        
        // Center map
        map.setCenter({ lat: latitude, lng: longitude });
        
        // Update or create marker
        if (marker) {
          marker.setPosition({ lat: latitude, lng: longitude });
        } else {
          const newMarker = new window.google.maps.Marker({
            position: { lat: latitude, lng: longitude },
            map: map,
            draggable: true,
            animation: window.google.maps.Animation.DROP,
          });
          
          setMarker(newMarker);
          
          // Handle marker drag end event
          newMarker.addListener('dragend', () => {
            const position = newMarker.getPosition();
            const lat = position.lat();
            const lng = position.lng();
            
            // Reverse geocode to get address from coordinates
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results[0]) {
                const address = results[0].formatted_address;
                
                setSelectedLocation({
                  latitude: lat,
                  longitude: lng,
                  address
                });
                
                // Notify parent component
                onLocationSelected({
                  latitude: lat,
                  longitude: lng,
                  address
                });
              }
            });
          });
        }
        
        setSelectedLocation({
          latitude,
          longitude,
          address
        });
        
        // Notify parent component
        onLocationSelected({
          latitude,
          longitude,
          address
        });
      }
    });
  };

  return (
    <div className="w-full space-y-4">
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
        >
          <FaSearch />
        </button>
      </form>
      
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border border-gray-300 bg-gray-100"
      ></div>
      
      {selectedLocation.address && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-start">
            <FaMapMarkerAlt className="text-blue-600 mt-1 mr-2" />
            <div>
              <h3 className="font-medium text-blue-800">Selected Location</h3>
              <p className="text-sm text-gray-700">{selectedLocation.address}</p>
              <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                <span>Lat: {parseFloat(selectedLocation.latitude).toFixed(6)}</span>
                <span>Lng: {parseFloat(selectedLocation.longitude).toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

export default function MapSelector({ 
  initialLocation = null, 
  onLocationSelected = () => {},
  height = '400px',
  readOnly = false
}) {
  const [selectedPosition, setSelectedPosition] = useState(
    initialLocation ? 
    { lat: parseFloat(initialLocation.latitude), lng: parseFloat(initialLocation.longitude) } : 
    null
  );
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  });

  useEffect(() => {
    if (initialLocation) {
      setSelectedPosition({
        lat: parseFloat(initialLocation.latitude),
        lng: parseFloat(initialLocation.longitude)
      });
    }
  }, [initialLocation]);

  // Default center (Toronto)
  const defaultCenter = { lat: 43.6532, lng: -79.3832 };
  
  const handleMapClick = (event) => {
    if (readOnly) return;
    
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };
    
    setSelectedPosition(newPosition);
    
    // Get address from coordinates using reverse geocoding
    getAddressFromLatLng(newPosition.lat, newPosition.lng)
      .then(address => {
        onLocationSelected({
          latitude: newPosition.lat,
          longitude: newPosition.lng,
          address: address
        });
      });
  };
  
  const getAddressFromLatLng = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      
      return '';
    } catch (error) {
      console.error('Error getting address:', error);
      return '';
    }
  };

  return (
    <div style={{ height }}>
      {!isLoaded ? (
        <div className="flex h-full justify-center items-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
          center={selectedPosition || defaultCenter}
          zoom={selectedPosition ? 15 : 10}
          onClick={handleMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
          }}
        >
          {selectedPosition && (
            <Marker
              position={selectedPosition}
              draggable={!readOnly}
              onDragEnd={(e) => {
                const newPosition = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng()
                };
                
                setSelectedPosition(newPosition);
                
                getAddressFromLatLng(newPosition.lat, newPosition.lng)
                  .then(address => {
                    onLocationSelected({
                      latitude: newPosition.lat,
                      longitude: newPosition.lng,
                      address: address
                    });
                  });
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
}
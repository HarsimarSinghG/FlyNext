'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Component that loads only on client-side to avoid SSR issues
const StaticMapContent = ({ latitude, longitude }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Import Leaflet dynamically only on client side
    const L = require('leaflet');
    
    // Fix the default icon issue
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });

    // Only initialize the map if it hasn't been created yet
    if (!mapInstanceRef.current && mapRef.current) {
      // Create the map instance
      const map = L.map(mapRef.current).setView([latitude, longitude], 15);
      
      // Add the OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Add a marker at the specified position
      L.marker([latitude, longitude]).addTo(map);
      
      // Store the map instance
      mapInstanceRef.current = map;
    } else if (mapInstanceRef.current) {
      // Update the map view if the coordinates change
      mapInstanceRef.current.setView([latitude, longitude], 15);
      
      // Clear existing layers and add a new marker
      mapInstanceRef.current.eachLayer(layer => {
        if (layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });
      
      L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>;
};

// Export a dynamic component that only loads on the client
const StaticMap = dynamic(() => Promise.resolve(StaticMapContent), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export default StaticMap;
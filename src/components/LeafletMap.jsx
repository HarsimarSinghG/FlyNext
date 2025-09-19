'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for leaflet marker icon issues
// Default marker icons in Leaflet don't work correctly in Next.js
// This is because the marker image paths are broken when bundled
function fixLeafletIcon() {
  delete L.Icon.Default.prototype._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

// Update map view when position changes
function ChangeMapView({ center }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  
  return null;
}

// Handle map interactions
function MapInteractions({ onPositionChange }) {
  const map = useMap();
  
  // Add map event handlers
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onPositionChange({ lat, lng });
    }
  });
  
  return null;
}

export default function LeafletMap({ position, onPositionChange }) {
  const markerRef = useRef(null);
  
  // Fix the Leaflet icon issue when component mounts
  useEffect(() => {
    fixLeafletIcon();
  }, []);
  
  // Handle marker drag end
  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const position = marker.getLatLng();
        onPositionChange({ lat: position.lat, lng: position.lng });
      }
    }
  };
  
  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker 
        position={position} 
        draggable={true}
        eventHandlers={eventHandlers}
        ref={markerRef}
      />
      <ChangeMapView center={position} />
      <MapInteractions onPositionChange={onPositionChange} />
    </MapContainer>
  );
}
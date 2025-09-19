import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix the default marker icon issue in Leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Component to handle position updates and map clicks
function MapController({ position, onPositionChange }) {
  const map = useMap();
  
  // Center map when position changes from parent
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);
  
  // Set up click handler on the map
  useEffect(() => {
    const handleMapClick = (e) => {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, onPositionChange]);
  
  return null;
}

export default function MapPicker({ latitude, longitude, onPositionChange }) {
  const position = [latitude, longitude];
  
  return (
    <MapContainer 
      center={position} 
      zoom={13} 
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position}>
        <Popup>
          Hotel Location<br />
          Click anywhere on map to update
        </Popup>
      </Marker>
      <MapController position={position} onPositionChange={onPositionChange} />
    </MapContainer>
  );
}
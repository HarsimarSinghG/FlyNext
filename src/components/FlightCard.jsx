'use client';

import React from 'react';
import { FaClock, FaPlane, FaInfoCircle } from 'react-icons/fa';
import Link from 'next/link';

export default function FlightCard({ 
  flight, 
  onAddToCart, 
  tripType,
  departureDate,
  returnDate,
  passengers,
  isReturn = false,
  safeFormatDate,
  formatDuration,
}) {
  // Handle both single object and code string origin/destination formats
  const originDisplay = typeof flight.origin === 'object' 
    ? flight.origin.code
    : flight.origin;
  
  const destinationDisplay = typeof flight.destination === 'object'
    ? flight.destination.code
    : flight.destination;
    
  // Determine airline name (handle both string and object formats)
  const airlineName = typeof flight.airline === 'object' 
    ? flight.airline.name || flight.airline.code 
    : flight.airline;

  // Generate a compound ID for multi-leg flights using a special separator
  // For a single flight, just use its ID
  const SEPARATOR = "splitting_here";
  let flightId;
  
  if (flight.flights && flight.flights.length > 0) {
    // Create a compound ID from all flight segments using the special separator
    flightId = flight.flights.map(f => f.id).join(SEPARATOR);
    console.log('Created compound ID for multi-leg flight:', flightId);
  } else {
    // Use the flight's own ID for single-leg flights
    flightId = flight.id;
    console.log('Using single flight ID:', flightId);
  }

  const handleAddToCart = () => {
    // Create a complete flight object with all necessary data
    const flightToAdd = {
      ...flight,
      passengers: passengers || 1,
      departureDate: departureDate,
      returnDate: returnDate,
      tripType: tripType
    };
    
    console.log('Adding to cart:', flightToAdd);
    onAddToCart(flightToAdd, isReturn);
  };

  return (
    <div className="border border-gray-200 rounded-md p-4 hover:border-blue-500 transition-colors">
      {/* Debug ID Banner */}
      <div className="mb-3 bg-gray-50 border border-gray-200 rounded p-2">
        <div className="text-xs text-gray-600 font-mono">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              <span className="font-semibold">Using ID:</span> {flightId || 'Missing ID!'}
            </div>
            {flight.flights && flight.flights.length > 0 && (
              <div>
                <span className="font-semibold">Legs:</span> {flight.flights.length}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Flight Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            {/* Departure Info */}
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {flight.departureTime ? safeFormatDate(flight.departureTime, 'h:mm a') : 'N/A'}
              </span>
              <span className="text-sm text-gray-500">
                {originDisplay} • {flight.departureTime ? safeFormatDate(flight.departureTime, 'MMM d') : 'N/A'}
              </span>
            </div>
            
            {/* Duration */}
            <div className="hidden md:flex flex-col items-center my-2 md:my-0">
              <span className="text-xs text-gray-500 mb-1">
                {formatDuration(flight.totalDuration || flight.duration)}
              </span>
              <div className="relative w-32">
                <div className="h-0.5 bg-gray-300 absolute top-1/2 w-full"></div>
                <div className="absolute top-1/2 left-0 -mt-1 w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="absolute top-1/2 right-0 -mt-1 w-2 h-2 rounded-full bg-gray-400"></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">
                {flight.layovers && flight.layovers.length > 0 
                  ? `${flight.layovers.length} ${flight.layovers.length === 1 ? 'stop' : 'stops'}`
                  : 'Nonstop'}
              </span>
            </div>
            
            {/* Arrival Info */}
            <div className="flex flex-col">
              <span className="text-lg font-bold">
                {flight.arrivalTime ? safeFormatDate(flight.arrivalTime, 'h:mm a') : 'N/A'}
              </span>
              <span className="text-sm text-gray-500">
                {destinationDisplay} • {flight.arrivalTime ? safeFormatDate(flight.arrivalTime, 'MMM d') : 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Mobile Duration (visible only on small screens) */}
          <div className="flex md:hidden items-center space-x-2 mb-4">
            <FaClock className="text-gray-400" />
            <span className="text-sm text-gray-600">
              {formatDuration(flight.totalDuration || flight.duration)}
            </span>
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
              {flight.layovers && flight.layovers.length > 0 
                ? `${flight.layovers.length} ${flight.layovers.length === 1 ? 'stop' : 'stops'}`
                : 'Nonstop'}
            </span>
          </div>
          
          {/* Layover Info */}
          {flight.layovers && flight.layovers.length > 0 && (
            <div className="text-xs text-gray-500 mb-4 flex flex-wrap">
              {flight.layovers.map((layover, index) => {
                const airportCode = typeof layover.airport === 'object' 
                  ? layover.airport.code 
                  : layover.airport;
                  
                return (
                  <React.Fragment key={index}>
                    {index > 0 && <span className="mx-1">•</span>}
                    <span>
                      {airportCode} ({formatDuration(layover.duration)} layover)
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
          
          {/* Airlines Info */}
          <div className="text-sm text-gray-600 flex items-center">
            <FaPlane className="text-gray-400 mr-2" size={14} />
            {flight.flightNumber 
              ? `${airlineName} ${flight.flightNumber}` 
              : flight.flights 
                ? Array.from(new Set(flight.flights.map(f => 
                    typeof f.airline === 'object' ? f.airline.name : f.airline))).join(', ')
                : airlineName}
          </div>
        </div>
        
        {/* Price and Action */}
        <div className="flex flex-col items-end">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            ${(flight.totalPrice || flight.price).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {flight.currency} • per person
          </div>
          <div className="flex flex-col space-y-2 w-full">
            <Link
              href={`/flights/${flightId}?tripType=${tripType}&departureDate=${departureDate}${returnDate ? `&returnDate=${returnDate}` : ''}&isReturn=${isReturn ? 'true' : 'false'}&passengers=${passengers}`}
              className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-center"
            >
              View Details
            </Link>
            <button
              onClick={handleAddToCart}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCartItems(parsedCart);
        } catch (error) {
          console.error('Error parsing cart from localStorage:', error);
          localStorage.removeItem('cart');
        }
      }
      setInitialized(true);
    }
  }, []);

  // Update localStorage when cart changes
  useEffect(() => {
    if (initialized && typeof window !== 'undefined') {
      localStorage.setItem('cart', JSON.stringify(cartItems));
      
      // Calculate cart total
      const total = cartItems.reduce((sum, item) => {
        if (item.type === 'flight') {
          // For flights, we need to multiply by passengers
          return sum + (item.totalPrice * (item.passengers || 1));
        }
        return sum + item.totalPrice;
      }, 0);
      
      setCartTotal(total);
    }
  }, [cartItems, initialized]);

  // Add a hotel booking to the cart
  const addHotelBooking = (hotelData) => {
    const existingItemIndex = cartItems.findIndex(
      item => 
        item.type === 'hotel' && 
        item.hotelId === hotelData.hotelId && 
        item.roomTypeId === hotelData.roomTypeId &&
        item.checkInDate === hotelData.checkInDate &&
        item.checkOutDate === hotelData.checkOutDate
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedItems = [...cartItems];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        numberOfRooms: hotelData.numberOfRooms,
        totalPrice: hotelData.totalPrice
      };
      setCartItems(updatedItems);
    } else {
      // Add new item
      setCartItems([
        ...cartItems,
        {
          id: uuidv4(), // Generate a unique ID
          type: 'hotel',
          ...hotelData
        }
      ]);
    }
  };

  // Add a flight booking to the cart
  const addFlightBooking = (flightData, isReturn = false) => {
    console.log('Adding flight to cart:', flightData, 'isReturn:', isReturn);
    
    // Ensure all IDs are captured properly
    let itemId;
    let flightIds = [];
    
    // Process multi-flight itineraries
    if (flightData.flights && flightData.flights.length > 0) {
      flightIds = flightData.flights.map(flight => flight.id);
      itemId = flightData.itineraryId || flightData.id || flightIds.join('splitting_here');
    } else {
      itemId = flightData.id;
      flightIds = [flightData.id];
    }
    
    // Add the item
    setCartItems([
      ...cartItems,
      {
        id: uuidv4(), // Generate a unique ID for the cart item
        type: 'flight',
        flightId: itemId, // Original ID (single flight or itinerary)
        itineraryId: flightData.itineraryId || flightData.id || itemId,
        flights: flightData.flights || [flightData], // Store all flights in an itinerary
        origin: flightData.origin,
        destination: flightData.destination,
        departureTime: flightData.departureTime,
        arrivalTime: flightData.arrivalTime,
        departureDate: flightData.departureDate || new Date(flightData.departureTime).toISOString().split('T')[0],
        returnDate: flightData.returnDate,
        duration: flightData.totalDuration || flightData.duration,
        price: flightData.price || 0,
        totalPrice: flightData.totalPrice || flightData.price || 0,
        currency: flightData.currency || 'CAD',
        passengers: flightData.passengers || 1,
        tripType: flightData.tripType || 'one-way',
        isReturn,
        flightNumber: flightData.flightNumber,
        airline: flightData.airline,
        layovers: flightData.layovers || [],
      }
    ]);
  };

  // Remove an item from the cart
  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  // Clear the entire cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Get the number of items in the cart
  const getCartItemCount = () => {
    return cartItems.length;
  };

  return (
    <CartContext.Provider 
      value={{ 
        cartItems, 
        cartTotal, 
        addHotelBooking,
        addFlightBooking,
        removeItem,
        clearCart,
        getCartItemCount,
        initialized
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
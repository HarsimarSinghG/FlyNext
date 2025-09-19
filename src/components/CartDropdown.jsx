'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { FaShoppingCart, FaTrashAlt, FaPlaneDeparture, FaHotel } from 'react-icons/fa';
import { format, differenceInDays } from 'date-fns';

const CartDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { cartItems, cartTotal, removeItem, clearCart } = useCart();
  const router = useRouter();
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);
  
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    setIsOpen(false);
    router.push('/checkout');
  };
  
  return (
    <div ref={dropdownRef} className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-50 px-4 py-2 text-blue-600 hover:bg-blue-100 transition-all"
      >
        <FaShoppingCart size={16} className="mr-2" />
        <span>Cart ({cartItems.length})</span>
      </button>
      
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2 divide-y divide-gray-100">
            <div className="px-4 py-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Your Booking Cart</h3>
            </div>
            
            {cartItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                Your cart is empty
              </div>
            ) : (
              <>
                <div className="max-h-96 overflow-y-auto">
                  {cartItems.map(item => (
                    <div key={item.id} className="px-4 py-3 hover:bg-gray-50">
                      {item.type === 'hotel' && (
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <FaHotel className="text-blue-500 mr-2" size={14} />
                              <p className="text-sm font-medium text-gray-900">{item.hotelName}</p>
                            </div>
                            <p className="text-xs text-gray-500">{item.roomTypeName}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(item.checkInDate), 'MMM dd, yyyy')} - {format(new Date(item.checkOutDate), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-xs text-gray-500">{item.numberOfRooms} room(s) × {differenceInDays(new Date(item.checkOutDate), new Date(item.checkInDate))} night(s)</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-medium text-gray-900">${item.totalPrice.toFixed(2)}</p>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 mt-1"
                            >
                              <FaTrashAlt size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {item.type === 'flight' && (
                        <div className="flex justify-between">
                          <div>
                            <div className="flex items-center">
                              <FaPlaneDeparture className="text-blue-500 mr-2" size={14} />
                              <p className="text-sm font-medium text-gray-900">
                                {item.tripType === 'one-way' ? 'One-way Flight' : 'Round-trip Flight'}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              {item.origin} → {item.destination}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(item.departureDate), 'MMM dd, yyyy')}
                              {item.tripType === 'round-trip' && ` - ${format(new Date(item.returnDate), 'MMM dd, yyyy')}`}
                            </p>
                            <p className="text-xs text-gray-500">Passengers: {item.passengers}</p>
                          </div>
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-medium text-gray-900">${item.totalPrice.toFixed(2)}</p>
                            <button 
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 mt-1"
                            >
                              <FaTrashAlt size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="px-4 py-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-blue-600">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button 
                      onClick={clearCart}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear Cart
                    </button>
                    <button
                      onClick={handleCheckout}
                      className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDropdown;
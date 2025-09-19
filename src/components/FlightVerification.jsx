import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function FlightVerification({ flightBookingId, authFetch }) {
  const [isVerifying, setIsVerifying] = useState(true); // Start in verifying state
  const [verificationData, setVerificationData] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  
  // Auto-verify when component mounts
  useEffect(() => {
    verifyFlight();
  }, [flightBookingId]);

  const verifyFlight = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const response = await authFetch(`/api/flights/${flightBookingId}/verify`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify flight');
      }
      
      const data = await response.json();
      setVerificationData(data);
    } catch (error) {
      console.error('Error verifying flight:', error);
      setVerificationError(error.message || 'Failed to verify flight status');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper function to safely extract string values from objects or strings
  const safelyGetString = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.code) return value.code;
    if (typeof value === 'object' && value.name) return value.name;
    return JSON.stringify(value).slice(0, 50);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    try {
      return format(new Date(dateTimeString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    const statusStr = safelyGetString(status).toUpperCase();
    
    switch (statusStr) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'DELAYED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {isVerifying ? (
        <div className="flex justify-center items-center py-6">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">Verifying flight status...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 border-l-4 border-blue-600">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-gray-900">Flight Verification</h3>
          </div>
          
          {verificationError ? (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
              <p className="font-medium">Error verifying flight</p>
              <p className="text-sm">{verificationError}</p>
            </div>
          ) : verificationData ? (
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(verificationData.status)}`}>
                  {safelyGetString(verificationData.status) || 'UNKNOWN'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Booking Reference:</span>
                <span className="font-medium">{safelyGetString(verificationData.bookingReference)}</span>
              </div>
              
              {verificationData.ticketNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Number:</span>
                  <span className="font-medium">{safelyGetString(verificationData.ticketNumber)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Flight:</span>
                <span className="font-medium">
                  {safelyGetString(verificationData.airline)} {safelyGetString(verificationData.flightNumber)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Route:</span>
                <span className="font-medium">
                  {safelyGetString(verificationData.origin)} → {safelyGetString(verificationData.destination)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Departure:</span>
                <span className="font-medium">{formatDateTime(verificationData.departureTime)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Arrival:</span>
                <span className="font-medium">{formatDateTime(verificationData.arrivalTime)}</span>
              </div>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-gray-700 text-sm">{safelyGetString(verificationData.message)}</p>
                <p className="text-gray-500 text-xs mt-1">Last verified: {formatDateTime(verificationData.lastVerified)}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-gray-50 text-gray-700 rounded">
              <p>No verification data available</p>
            </div>
          )}
          
          <div className="mt-4">
            <button
              onClick={verifyFlight}
              disabled={isVerifying}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50 transition duration-150 text-sm flex items-center justify-center"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                'Refresh Status'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a PDF invoice for a booking and saves it to the public directory
 * @param {Object} booking - The booking object with all related data
 * @returns {Promise<string>} - The path to the generated PDF file
 */
export async function generateInvoicePDF(booking) {
  return new Promise((resolve, reject) => {
    try {
      // Ensure the invoices directory exists
      const publicDir = path.join(process.cwd(), 'public');
      const invoicesDir = path.join(publicDir, 'invoices');

      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Create a unique filename
      const fileName = `booking-${booking.id}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      // Create a PDF document (A4 size in portrait orientation)
      const doc = new jsPDF({
        orientation: 'portrait', 
        unit: 'mm',
        format: 'a4'
      });
      
      // Set initial position
      let yPos = 20;

      // Add company header
      doc.setFontSize(20);
      doc.text('FlyNext', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.text('Your Complete Travel Solution', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(16);
      doc.text('INVOICE', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      // Add booking details
      yPos += 12;
      doc.setFontSize(14);
      doc.text(`Booking Reference: ${booking.id}`, 20, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString()}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Status: ${booking.status.toUpperCase()}`, 20, yPos);
      
      // Add payment info
      yPos += 12;
      doc.setFontSize(12);
      doc.text('Payment Information:', 20, yPos);
      
      yPos += 7;
      doc.setFontSize(10);
      doc.text(`Method: Credit Card (${booking.paymentCardType})`, 20, yPos);
      
      yPos += 7;
      doc.text(`Card: **** **** **** ${booking.paymentCardLast4}`, 20, yPos);
      
      yPos += 7;
      doc.text(`Expiry: ${booking.paymentCardExpiry}`, 20, yPos);
      
      // Add hotel bookings if any
      if (booking.hotelBookings && booking.hotelBookings.length > 0) {
        yPos += 12;
        doc.setFontSize(12);
        doc.text('Hotel Bookings:', 20, yPos);
        yPos += 7;
        
        booking.hotelBookings.forEach((hotelBooking, index) => {
          const nights = Math.round(
            (new Date(hotelBooking.checkOutDate) - new Date(hotelBooking.checkInDate)) /
            (1000 * 60 * 60 * 24)
          );
          
          doc.setFontSize(10);
          doc.text(`${index + 1}. ${hotelBooking.hotel.name}`, 20, yPos);
          yPos += 6;
          doc.text(`   Address: ${hotelBooking.hotel.address}`, 20, yPos);
          yPos += 6;
          doc.text(`   Room Type: ${hotelBooking.roomType.name}`, 20, yPos);
          yPos += 6;
          doc.text(`   Check-in: ${new Date(hotelBooking.checkInDate).toLocaleDateString()}`, 20, yPos);
          yPos += 6;
          doc.text(`   Check-out: ${new Date(hotelBooking.checkOutDate).toLocaleDateString()}`, 20, yPos);
          yPos += 6;
          doc.text(`   Duration: ${nights} night(s)`, 20, yPos);
          yPos += 6;
          doc.text(`   Rooms: ${hotelBooking.numberOfRooms}`, 20, yPos);
          yPos += 6;
          doc.text(`   Price: $${hotelBooking.totalPrice?.toFixed(2) || '0.00'}`, 20, yPos);
          yPos += 10;
        });
      }
      
      // Add flight bookings if any
      if (booking.flightBookings && booking.flightBookings.length > 0) {
        yPos += 5;
        doc.setFontSize(12);
        doc.text('Flight Bookings:', 20, yPos);
        yPos += 7;
        
        booking.flightBookings.forEach((flightBooking, index) => {
          doc.setFontSize(10);
          doc.text(`${index + 1}. Flight: ${flightBooking.departureAirportCode} to ${flightBooking.arrivalAirportCode}`, 20, yPos);
          yPos += 6;
          doc.text(`   Departure: ${new Date(flightBooking.departureTime).toLocaleString()}`, 20, yPos);
          yPos += 6;
          doc.text(`   Arrival: ${new Date(flightBooking.arrivalTime).toLocaleString()}`, 20, yPos);
          yPos += 6;
          doc.text(`   Flight ID: ${flightBooking.afsFlightId}`, 20, yPos);
          yPos += 6;
          doc.text(`   Passengers: ${flightBooking.passengers}`, 20, yPos);
          yPos += 10;
        });
      }
      
      // Add total price
      doc.setFontSize(14);
      doc.text(`Total Amount: $${booking.totalPrice?.toFixed(2) || '0.00'}`, 
        doc.internal.pageSize.width - 20, yPos, { align: 'right' });
      
      // Add footer
      yPos = 270; // Position near bottom of page
      doc.setFontSize(10);
      doc.text('Thank you for choosing TravelHub for your travel needs!', 
        doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.text('For customer support, please contact support@travelhub.com', 
        doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      yPos += 6;
      doc.text(`Invoice generated on ${new Date().toLocaleString()}`, 
        doc.internal.pageSize.width / 2, yPos, { align: 'center' });
      
      // Save the PDF to disk
      const pdfOutput = doc.output();
      fs.writeFileSync(filePath, pdfOutput, 'binary');
      
      // Return the public URL to the PDF file
      const publicUrl = `/api/invoices/${fileName}`;
      resolve(publicUrl);
      
    } catch (error) {
      reject(error);
    }
  });
}
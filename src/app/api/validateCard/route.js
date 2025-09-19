import { NextResponse } from 'next/server';
import { validateCardDetails } from '@/utils/cardValidation';

/**
 * API endpoint to validate credit card details without processing a real payment
 */
export async function POST(request) {
    try {
        const body = await request.json();
        
        // Extract card details from the request
        const cardDetails = {
            cardNumber: body.cardNumber,
            cardExpiry: body.cardExpiry,
            cardCvc: body.cardCvc
        };
        
        // Validate the card details
        const validationResult = validateCardDetails(cardDetails);
        
        if (validationResult.isValid) {
            // Return success response with detected card type
            return NextResponse.json({
                valid: true,
                cardType: validationResult.cardType,
                cardLast4: body.cardNumber.replace(/\D/g, '').slice(-4)
            });
        } else {
            // Return validation errors
            return NextResponse.json({
                valid: false,
                errors: validationResult.errors
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error validating card:', error);
        return NextResponse.json({
            valid: false,
            error: 'Error validating card details'
        }, { status: 500 });
    }
}
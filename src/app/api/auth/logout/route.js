import { NextResponse } from 'next/server';

// Typically you might delete tokens client-side or handle a token blacklist here.
// For simplicity, we'll assume front-end just clears token from storage.

export async function POST() {
    // This can be a no-op if you're using stateless JWT,
    // or handle server-side session invalidation if using a DB-stored session.
    return NextResponse.json({ message: 'Logged out successfully' });
}

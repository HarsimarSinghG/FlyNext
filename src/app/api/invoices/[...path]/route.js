import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    // Get the path from URL params
    const invoicePath = Array.isArray(params.path) ? params.path.join('/') : params.path;
    
    // Construct the full path to the invoice file
    const filePath = path.join(process.cwd(), 'public', 'invoices', invoicePath);
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Return the file as PDF
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Error serving invoice:', error);
    return NextResponse.json(
      { error: 'Invoice not found' },
      { status: 404 }
    );
  }
}
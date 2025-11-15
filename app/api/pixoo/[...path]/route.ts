// Proxy API route to avoid CORS issues with localhost:6001
import { NextRequest, NextResponse } from 'next/server';

const PIXOO_SERVER = 'http://localhost:6001';

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');
    const contentType = request.headers.get('content-type') || 'application/x-www-form-urlencoded';

    let body;
    if (contentType.includes('multipart/form-data')) {
      // For multipart/form-data (GIF uploads), pass the FormData directly
      body = await request.formData();
    } else {
      // For regular form data
      body = await request.text();
    }

    const response = await fetch(`${PIXOO_SERVER}/${path}`, {
      method: 'POST',
      headers: contentType.includes('multipart/form-data') ? {} : {
        'Content-Type': contentType,
      },
      body: body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Pixoo server error' },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pixoo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Pixoo server' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path.join('/');

    const response = await fetch(`${PIXOO_SERVER}/${path}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Pixoo server error' },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pixoo proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Pixoo server' },
      { status: 500 }
    );
  }
}

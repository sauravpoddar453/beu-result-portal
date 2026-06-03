import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing target url parameter' }, { status: 400 });
  }

  // Security check: Only allow requests to the official BEU university domain
  if (!targetUrl.startsWith('https://beu-bih.ac.in/') && !targetUrl.startsWith('https://www.beu-bih.ac.in/')) {
    return NextResponse.json({ error: 'Forbidden target url host' }, { status: 403 });
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `University server responded with status: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch from university server' }, { status: 500 });
  }
}

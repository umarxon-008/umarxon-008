import { NextResponse, type NextRequest } from 'next/server';

// Optimistik tekshiruv: sessiya cookie bo'lmasa /app sahifalaridan /login ga yo'naltiradi.
// Haqiqiy tekshiruv (sessiya, a'zolik, rol) har bir sahifa va API'da serverda bajariladi.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('ec_session');
  if (!hasSession && request.nextUrl.pathname.startsWith('/app')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*'] };

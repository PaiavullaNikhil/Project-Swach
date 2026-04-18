import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude API routes, login page, and static assets from auth check
  if (
    pathname.startsWith('/api') || 
    pathname === '/login' || 
    pathname.startsWith('/_next') ||
    pathname.includes('favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 2. Check for the admin session cookie
  const session = request.cookies.get('ps_admin_session');

  if (!session) {
    // Redirect to login if no session found
    const url = new URL('/login', request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

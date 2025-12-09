import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // allow assets and api
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon') || pathname.startsWith('/uploads')) {
    return NextResponse.next()
  }
  // allow login
  if (pathname === '/login') return NextResponse.next()

  const raw = req.cookies.get('session')?.value
  if (!raw) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  let data: any
  try { data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) } catch {
    const url = req.nextUrl.clone(); url.pathname = '/login'; return NextResponse.redirect(url)
  }

  if (data?.role === 'technician') {
    const allowed = ['/orders', '/scanner']
    if (!allowed.includes(pathname)) {
      const url = req.nextUrl.clone()
      url.pathname = '/orders'
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
}

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isAuthenticatedFromCookie, validateBasicAuth } from './lib/auth'

export const middleware = (request: NextRequest) => {
  // ログインページは認証不要
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // 認証API は認証不要
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Cookieで認証済みかチェック
  if (isAuthenticatedFromCookie(request)) {
    return NextResponse.next()
  }

  // Basic認証をチェック
  if (validateBasicAuth(request)) {
    // 認証成功時はCookieを設定してリダイレクト
    const response = NextResponse.next()
    response.headers.set(
      'Set-Cookie',
      'auth-token=authenticated; Path=/; HttpOnly; SameSite=Strict'
    )
    return response
  }

  // 認証が必要な場合はログインページにリダイレクト
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

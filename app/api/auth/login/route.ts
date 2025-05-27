import { setAuthCookie } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json()

    const validUsername = process.env.BASIC_AUTH_USERNAME || 'admin'
    const validPassword = process.env.BASIC_AUTH_PASSWORD

    if (username === validUsername && password === validPassword) {
      const response = NextResponse.json({ success: true })
      response.headers.set('Set-Cookie', setAuthCookie())
      return response
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

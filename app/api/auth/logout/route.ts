import { NextResponse } from 'next/server'

export const POST = async () => {
  const response = NextResponse.json({ success: true })
  response.headers.set(
    'Set-Cookie',
    'auth-token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
  )
  return response
}

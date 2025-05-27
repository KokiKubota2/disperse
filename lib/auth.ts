import { NextRequest } from 'next/server'

export interface AuthCredentials {
  username: string
  password: string
}

export const validateBasicAuth = (request: NextRequest): boolean => {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  const base64Credentials = authHeader.slice(6)
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
  const [username, password] = credentials.split(':')

  const validUsername = process.env.BASIC_AUTH_USERNAME || 'admin'
  const validPassword = process.env.BASIC_AUTH_PASSWORD

  return username === validUsername && password === validPassword
}

export const createBasicAuthResponse = (): Response => {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Disperse POC"',
    },
  })
}

export const isAuthenticatedFromCookie = (request: NextRequest): boolean => {
  const authCookie = request.cookies.get('auth-token')
  return authCookie?.value === 'authenticated'
}

export const setAuthCookie = (): string => {
  return 'auth-token=authenticated; Path=/; HttpOnly; SameSite=Strict'
}

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { findUserByEmail, toAppUser } from '@/lib/database/users'
import { verifyPassword } from '@/lib/server/password'
import { configureNextAuthUrl, requireAuthSecret, validateServerEnv } from '@/lib/server/env'

validateServerEnv()
configureNextAuthUrl()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
        try {
          const user = await findUserByEmail(credentials.email)
          if (!user) return null
          const validPassword = await verifyPassword(credentials.password, user.encryptedPassword)
          return validPassword ? toAppUser(user) : null
        } catch (error) {
          console.error('Sign in failed:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.phone = user.phone
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string,
        phone: token.phone as string
      }
      return session
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  secret: requireAuthSecret()
}

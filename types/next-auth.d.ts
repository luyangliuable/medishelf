import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      phone: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string
    phone: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    phone?: string
  }
}

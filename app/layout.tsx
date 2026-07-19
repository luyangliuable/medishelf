import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AuthProvider from '@/app/providers/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'MediShelf',
  description: 'MediShelf photo uploads'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-svh antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-center" duration={1000} closeButton />
        </AuthProvider>
      </body>
    </html>
  )
}

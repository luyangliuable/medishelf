import './globals.css'

export const metadata = {
  title: 'MediShelf',
  description: 'MediShelf photo uploads'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

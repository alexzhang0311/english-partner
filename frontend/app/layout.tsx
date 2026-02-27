import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'English Partner',
  description: 'Your daily English learning companion',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

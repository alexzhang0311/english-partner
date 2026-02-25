import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'English Partner',
  description: 'Your daily English learning companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scoutly',
  description: 'AI-powered sponsorship prospecting for Shikenso Analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}

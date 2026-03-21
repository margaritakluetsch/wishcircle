import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WishCircle – Gemeinsam schenken',
  description: 'Die erste globale Wunschlisten-Plattform mit sicherer Gruppenfinanzierung',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}

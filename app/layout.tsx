import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DigitalBuddy",
  description: "Digital human video call application for therapeutic sessions",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>DigitalBuddy</title>
        <meta name="personaId" content="e672106f-b8d2-41eb-8988-588a3770aa78" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}

import { Analytics } from "@vercel/analytics/next"
import Link from 'next/link'
import type { Metadata } from "next"
import { Funnel_Sans } from "next/font/google"
import "./globals.css"

const font = Funnel_Sans({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Abandoned Game Explorer",
  description: "You got games on your phone?",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${font.className} antialiased`}>
        <div className="flex flex-col min-h-screen bg-[linear-gradient(360deg,#1b1e22_0%,#1b3452_30%,#315888_85%,#122235_100%)]">
          <nav className='fixed top-0 w-full z-50 flex-row p-4 bg-zinc-800 flex justify-between'>
            <Link href="/">Abandoned Game Explorer</Link>
            <div className='flex flex-row justify-between gap-6'>
              <Link href="/">Home</Link>
              <Link href="/learn">Learn More</Link>
              <Link href="/about">About Us</Link>
            </div>
          </nav>
          <div className="pt-20 flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}

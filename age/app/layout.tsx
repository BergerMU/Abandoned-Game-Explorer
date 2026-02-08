import { BrowserRouter } from 'react-router-dom';
import Link from 'next/link'
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Abandoned Game Explorer",
  description: "Discover your forgotten gems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        

      <nav className='flex flex-row justify-between p-4 bg-indigo-950 fixed top-0 w-full'>
        <Link href="/">Abandoned Game Explorer</Link>
        <div className='flex flex-row justify-between gap-6'>
          <Link href="/">Home</Link>
          <Link href="/learn">Learn More</Link>
          <Link href="/about">About Us</Link>
        </div>
      </nav>
        {children}
      </body>
    </html>
  )
}

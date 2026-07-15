import type { Metadata } from "next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const bodySans = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const displaySans = Fredoka({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'League Roast HQ',
    template: '%s | League Roast HQ',
  },
  description: 'The fantasy stats your league manager doesn\'t want you to see. Bench tax, draft grades, trade grades, and a weekly roast — for the Fantasy Island league.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
  openGraph: {
    title: 'League Roast HQ',
    description: 'Fantasy football roast site for the Fantasy Island league.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodySans.variable} ${displaySans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}

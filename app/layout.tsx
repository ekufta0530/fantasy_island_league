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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 px-6 py-3 bg-gray-950 border-b border-gray-800 text-sm font-medium">
          <a href="/" className="text-white font-black tracking-tight text-base">🏝️ Fantasy Island</a>
          <div className="flex items-center gap-5 ml-4 text-gray-400">
            <a href="/standings" className="hover:text-white transition-colors">Standings</a>
            <a href="/this-week" className="hover:text-white transition-colors">This Week</a>
            <a href="/hall-of-fame" className="hover:text-white transition-colors">Hall of Fame</a>
            <a href="/draft" className="hover:text-white transition-colors">Draft</a>
            <a href="/trades" className="hover:text-white transition-colors">Trades</a>
            <a href="/rivalries" className="hover:text-white transition-colors">Rivalries</a>
            <a href="/archive" className="hover:text-white transition-colors">Archive</a>
            <a href="/team" className="hover:text-white transition-colors">👥 Teams</a>
          </div>
        </nav>
        {/* Mobile nav */}
        <nav className="md:hidden bg-gray-950 border-b border-gray-800">
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <a href="/" className="text-white font-black tracking-tight text-sm whitespace-nowrap mr-2">🏝️</a>
            {[
              { href: '/standings', label: 'Standings' },
              { href: '/this-week', label: 'This Week' },
              { href: '/hall-of-fame', label: 'Hall of Fame' },
              { href: '/draft', label: 'Draft' },
              { href: '/trades', label: 'Trades' },
              { href: '/rivalries', label: 'Rivalries' },
              { href: '/archive', label: 'Archive' },
              { href: '/team', label: '👥 Teams' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 text-xs font-medium hover:bg-gray-700 hover:text-white transition-colors flex-shrink-0"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}

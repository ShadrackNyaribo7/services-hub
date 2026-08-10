import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import OfflineBanner from "@/components/OfflineBanner";
import MobileNav from "@/components/MobileNav";
import PWAInstallButton from "@/components/PWAInstallButton";
import { FOOTER_NAV_ITEMS, LEGAL_NAV_ITEMS } from "@/lib/navigation";
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
  metadataBase: new URL("https://www.patanafuu.pro"),
  title: {
    default: "PATANAFUU | Book Trusted Services Across Kenya",
    template: "%s | PATANAFUU",
  },
  description:
    "Find, compare, and book approved service providers across Kenya with secure authentication and M-Pesa payments.",
  applicationName: "PATANAFUU",
  keywords: [
    "Kenya service providers",
    "book services Kenya",
    "cleaning services",
    "electricians",
    "plumbers",
    "mechanics",
    "M-Pesa payments",
  ],
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "PATANAFUU",
    title: "PATANAFUU | Book Trusted Services Across Kenya",
    description:
      "Find, compare, and book approved service providers across Kenya.",
    url: "https://www.patanafuu.pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "PATANAFUU | Book Trusted Services Across Kenya",
    description:
      "Find, compare, and book approved service providers across Kenya.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "services marketplace",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PATANAFUU",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <header className="relative z-10 bg-gray-900 border-b border-gray-800">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-3 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center">
              <BrandLogo className="h-8 w-auto sm:h-10" />
            </Link>
            <MobileNav />
          </div>
        </header>
        <PWAInstallButton />
        {children}
        <footer className="relative z-10 bg-gray-800 text-slate-300 py-8 mt-auto">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="mb-4">
                  <BrandLogo className="h-10 w-auto sm:h-12" />
                </div>
                <p className="text-xs sm:text-sm">
                  Your platform for connecting with approved service providers
                  across Kenya.
                </p>
              </div>
              <div>
                <h2 className="text-base font-semibold text-white mb-4 sm:text-lg">
                  Quick Links
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {FOOTER_NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className="hover:text-emerald-400 transition"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-base font-semibold text-white mb-4 sm:text-lg">
                  Legal
                </h2>
                <ul className="space-y-2 text-xs sm:text-sm">
                  {LEGAL_NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="hover:text-emerald-400 transition"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-6 text-center text-xs sm:text-sm">
              <p>
                &copy; {new Date().getFullYear()} PATANAFUU. All rights
                reserved.
              </p>
              <p className="mt-2 text-slate-400">
                Contact: stilespulsar77@gmail.com
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

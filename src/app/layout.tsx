import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import LanguageToggle from "@/components/LanguageToggle/LanguageToggle";
import NavDashboardLink from "@/components/NavDashboardLink";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matryoshka | Homemade Food",
  description: "Traditional homemade food, prepared with love by local chefs.",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <LanguageProvider>
          <header style={{ background: "#fffaf4", borderBottom: "1px solid #e8dfd2", position: "sticky", top: 0, zIndex: 40 }}>
            <nav style={{ maxWidth: 1160, margin: "0 auto", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
              <Link href="/" style={{ textDecoration: "none", color: "#9d2622", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 27, whiteSpace: "nowrap" }}>
                ❀ Matryoshka <span style={{ fontSize: 10, display: "block", letterSpacing: "0.16em", color: "#775b51", marginTop: -3 }}>HOMEMADE FOOD</span>
              </Link>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "12px 19px", fontSize: 13 }}>
                <Link href="/#home">Home</Link>
                <Link href="/#menu">Menu</Link>
                <Link href="/events">Events</Link>
                <Link href="/#chefs">Our Chefs</Link>
                <Link href="/#how-it-works">How It Works</Link>
                <Link href="/#contact">Contact</Link>
                <NavDashboardLink />
                <LanguageToggle />
              </div>
            </nav>
          </header>

          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}


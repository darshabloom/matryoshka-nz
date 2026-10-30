import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavDashboardLink from "@/components/NavDashboardLink";
import SiteHeader from "@/components/SiteHeader";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import {BasketProvider} from "@/components/cart/BasketProvider";
import {CartDrawerProvider} from "@/components/cart/CartDrawerContext";
import ShoppingDrawer from "@/components/cart/ShoppingDrawer";


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
          <BasketProvider>
          <CartDrawerProvider>
          <SiteHeader account={<NavDashboardLink/>}/>

          {children}
          <ShoppingDrawer />
          </CartDrawerProvider>
        </BasketProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}


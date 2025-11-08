import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GigStream - Instant Payments for Gig Workers",
  description: "AI-powered real-time USDC payment streaming platform for gig workers on Arc blockchain",
  keywords: ["gig economy", "blockchain", "USDC", "Circle", "Arc", "instant payments"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
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
        className={`${inter.variable} antialiased`}
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

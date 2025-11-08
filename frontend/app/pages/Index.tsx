"use client";

import { Navbar } from "../../src/components/Navbar";
import { Hero } from "../../src/components/Hero";
import { Features } from "../../src/components/Features";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      
      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 GigStream. Built for Arc Hackathon. Powered by Circle.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

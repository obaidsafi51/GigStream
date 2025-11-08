"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { useAuthStore } from "../stores/auth-store";

export const Navbar = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-6 w-6 text-primary-foreground text-white" />
            </div>
            <span className="text-xl font-bold">GigStream</span>
          </Link>

          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-8">
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/tasks" className="text-sm font-medium hover:text-primary transition-colors">
                Tasks
              </Link>
              <Link href="/history" className="text-sm font-medium hover:text-primary transition-colors">
                History
              </Link>
              <Link href="/advance" className="text-sm font-medium hover:text-primary transition-colors">
                Advance
              </Link>
            </div>
          )}

          <UserMenu />
        </div>
      </div>
    </nav>
  );
};

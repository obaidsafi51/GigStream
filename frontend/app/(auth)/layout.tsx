import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - GigStream",
  description: "Sign in or create an account on GigStream",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Optional: Add a logo or header */}
      <div className="absolute top-4 left-4">
        <h1 className="text-2xl font-bold text-blue-600">GigStream</h1>
      </div>
      {children}
    </div>
  );
}

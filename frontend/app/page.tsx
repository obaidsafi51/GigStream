import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Welcome to GigStream
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Blockchain-powered instant payments for gig workers. 
            Get paid instantly with Circle's Arc blockchain technology.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/login">
            <Button size="lg">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline">
              Sign Up
            </Button>
          </Link>
        </div>

        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Instant Payments
            </h3>
            <p className="text-gray-600 text-sm">
              Receive payments immediately after completing your work
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔒 Secure & Transparent
            </h3>
            <p className="text-gray-600 text-sm">
              Blockchain-based payments with full transparency
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              💰 Low Fees
            </h3>
            <p className="text-gray-600 text-sm">
              Minimal transaction fees powered by Circle's Arc
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

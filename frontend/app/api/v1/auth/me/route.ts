import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Get Current User API Endpoint
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "Not authenticated",
      },
      { status: 401 }
    );
  }

  // Mock user data
  const mockUser = {
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    role: "worker" as const,
    walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
  };

  return NextResponse.json(
    {
      success: true,
      data: {
        user: mockUser,
      },
    },
    { status: 200 }
  );
}

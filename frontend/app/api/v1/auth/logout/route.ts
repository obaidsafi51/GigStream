import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Logout API Endpoint
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json(
    {
      success: true,
      message: "Logged out successfully",
    },
    { status: 200 }
  );

  // Clear auth cookie
  response.cookies.delete("auth_token");

  return response;
}

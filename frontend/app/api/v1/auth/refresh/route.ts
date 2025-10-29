import { NextRequest, NextResponse } from "next/server";

/**
 * Token Refresh API Endpoint
 * Refreshes the JWT token and extends the session
 */
export async function POST(request: NextRequest) {
  try {
    // Get current token from cookie
    const currentToken = request.cookies.get("auth_token")?.value;

    if (!currentToken) {
      return NextResponse.json(
        {
          success: false,
          message: "No active session",
        },
        { status: 401 }
      );
    }

    // In production, this would:
    // 1. Verify the current token
    // 2. Check if it's still valid
    // 3. Generate a new token
    // 4. Update the session expiry

    // Mock: Return the same user data with a new token
    const mockUser = {
      id: `user_${Date.now()}`,
      email: "test@example.com",
      name: "Test User",
      role: "worker" as const,
      walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
    };

    const newToken = `mock_jwt_refreshed_${Date.now()}`;

    const response = NextResponse.json(
      {
        success: true,
        message: "Token refreshed successfully",
        data: {
          user: mockUser,
          token: newToken,
        },
      },
      { status: 200 }
    );

    // Set new cookie
    response.cookies.set("auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Login API Endpoint
 * This is a temporary mock endpoint for testing the frontend
 * Replace this with actual backend API when ready
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
          errors: {
            email: !email ? ["Email is required"] : undefined,
            password: !password ? ["Password is required"] : undefined,
          },
        },
        { status: 400 }
      );
    }

    // Mock successful login
    // In production, this would:
    // 1. Find user by email
    // 2. Verify password hash
    // 3. Generate JWT token
    // 4. Set httpOnly cookie

    const mockUser = {
      id: `user_${Date.now()}`,
      email,
      name: "Test User",
      role: "worker" as const,
      walletAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
    };

    const mockToken = `mock_jwt_${Date.now()}`;

    // Set httpOnly cookie (mock)
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: mockUser,
          token: mockToken,
        },
      },
      { status: 200 }
    );

    // Set cookie
    response.cookies.set("auth_token", mockToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

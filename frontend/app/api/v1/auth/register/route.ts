import { NextRequest, NextResponse } from "next/server";

/**
 * Mock Registration API Endpoint
 * This is a temporary mock endpoint for testing the frontend
 * Replace this with actual backend API when ready
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
          errors: {
            name: !name ? ["Name is required"] : undefined,
            email: !email ? ["Email is required"] : undefined,
            password: !password ? ["Password is required"] : undefined,
            role: !role ? ["Role is required"] : undefined,
          },
        },
        { status: 400 }
      );
    }

    // Mock successful registration
    // In production, this would:
    // 1. Hash the password
    // 2. Create user in database
    // 3. Create wallet for workers
    // 4. Generate JWT token
    // 5. Set httpOnly cookie

    const mockUser = {
      id: `user_${Date.now()}`,
      email,
      name,
      role,
      walletAddress: role === "worker" ? `0x${Math.random().toString(16).slice(2, 42)}` : undefined,
    };

    const mockToken = `mock_jwt_${Date.now()}`;

    // Set httpOnly cookie (mock)
    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        data: {
          user: mockUser,
          token: mockToken,
        },
      },
      { status: 201 }
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
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}

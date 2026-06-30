import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { loginIdentifier, password } = await request.json(); // loginIdentifier can be email or username

    // 1. Basic validation
    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Missing login identifier (email/username) or password" },
        { status: 400 }
      );
    }

    // 2. Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.toLowerCase() },
          { username: loginIdentifier.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { error: "This account has been deactivated/banned by an administrator" },
        { status: 403 } // Forbidden
      );
    }

    // 4. Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    const isPasswordCorrect = await comparePassword(password, user.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 5. Generate JWT Token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 6. Set HTTP-only Cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    // 7. Return response
    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        isPro: user.isPro,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

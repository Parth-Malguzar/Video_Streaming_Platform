import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json();

    // 1. Basic validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, username, password" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // 2. Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.email.toLowerCase() === email.toLowerCase() ? "email" : "username";
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 409 } // Conflict
      );
    }

    // 3. Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
      },
    });

    // 4. Generate JWT Token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 5. Set HTTP-only Cookie
    // In Next.js 15, cookies() is asynchronous and must be awaited
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

    // 6. Return response (excluding the password hash for safety)
    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

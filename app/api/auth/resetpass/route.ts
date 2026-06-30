import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.DTUBE_JWT_SECRET!;
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // 1. Verify token signature & expiration
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(token, secretKey);
      payload = verifiedPayload;
    } catch {
      return NextResponse.json({ error: "Password reset link is invalid or expired" }, { status: 400 });
    }

    // 2. Validate token purpose
    if (payload.purpose !== "password-reset") {
      return NextResponse.json({ error: "Invalid token usage" }, { status: 400 });
    }

    const userId = payload.userId as string;

    // 3. Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // 4. Update the user password in database
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return NextResponse.json({ message: "Password has been successfully reset" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

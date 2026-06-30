import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.DTUBE_JWT_SECRET!;
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Prevent user enumeration: always return success
    if (!user) {
      return NextResponse.json({
        message: "If that email exists in our system, we have sent a password reset link.",
      });
    }

    // Generate short-lived reset token (15 mins)
    const resetToken = await new SignJWT({ userId: user.id, purpose: "password-reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secretKey);

    const origin = request.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    // Simulate sending email
    console.log("------------------- MOCK EMAIL OUTBOX -------------------");
    console.log(`To: ${user.email}`);
    console.log("Subject: DTube Password Reset Request");
    console.log(`Hi ${user.username},`);
    console.log(`Click the link below to reset your DTube password:`);
    console.log(resetUrl);
    console.log("This link will expire in 15 minutes.");
    console.log("---------------------------------------------------------");

    return NextResponse.json({
      message: "If that email exists in our system, we have sent a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

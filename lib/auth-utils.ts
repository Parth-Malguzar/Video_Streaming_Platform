import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

// Get our custom JWT secret key from the environment
const JWT_SECRET = process.env.DTUBE_CONSTELLATION_Conspiracy_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: DTUBE_CONSTELLATION_Conspiracy_SECRET");
}

// Convert our secret string into a Uint8Array required by the 'jose' library
const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Hash a plain text password using bcryptjs (O(1) call with high security factor)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify if a plain text password matches the hashed password stored in the database
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a payload and return a JWT token string
 * Set to expire in 7 days by default.
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" }) // Use HMAC SHA-256 algorithm
    .setIssuedAt()
    .setExpirationTime("7d") // Expire in 7 days
    .sign(secretKey);
}

/**
 * Verify a JWT token string and return its decoded payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    // If signature is invalid or token is expired, return null
    return null;
  }
}

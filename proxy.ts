import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 días
const EXPIRATION = "90d";
// Sliding session: renovar el token cuando ya tiene más de 1 día de antigüedad,
// así un usuario que entra seguido prácticamente nunca se desloguea.
const RENEW_AFTER_SECONDS = 60 * 60 * 24;

function getSecret(): Uint8Array {
  const secret = process.env["AUTH_SECRET"];
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function readToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

async function reissue(payload: JWTPayload): Promise<string> {
  return new SignJWT({ userId: payload["userId"], username: payload["username"] })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(getSecret());
}

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await readToken(token) : null;

  if (!isPublic && !payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(COOKIE_NAME); // limpiar token inválido/expirado
    return response;
  }

  if (pathname === "/login" && payload) {
    return NextResponse.redirect(new URL("/partidos", request.url));
  }

  const response = NextResponse.next();

  // Renovar la cookie si el token ya tiene más de 1 día (sliding session)
  if (
    payload &&
    typeof payload.iat === "number" &&
    Date.now() / 1000 - payload.iat > RENEW_AFTER_SECONDS
  ) {
    setSessionCookie(response, await reissue(payload));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.webmanifest|.*\\.svg).*)",
  ],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

function getSecret(): Uint8Array {
  const secret = process.env["AUTH_SECRET"];
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  const token = request.cookies.get("session")?.value;

  if (!isPublic) {
    if (!token || !(await verifyToken(token))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      const response = NextResponse.redirect(loginUrl);
      if (token) response.cookies.delete("session"); // limpiar token inválido/expirado
      return response;
    }
  }

  if (pathname === "/login" && token && (await verifyToken(token))) {
    return NextResponse.redirect(new URL("/partidos", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.webmanifest|.*\\.svg).*)",
  ],
};

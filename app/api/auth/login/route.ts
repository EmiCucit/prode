import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase/server";
import { signSession, makeSessionCookie } from "@/lib/auth/session";
import { checkRateLimit, getIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const { allowed } = await checkRateLimit("login", getIp(request), 5, "15 m");
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["username"] !== "string" ||
    typeof (body as Record<string, unknown>)["password"] !== "string"
  ) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const { username, password } = body as { username: string; password: string };

  const db = createServerClient();
  const { data: user, error } = await db
    .from("users")
    .select("id, username, display_name, avatar_key, password_hash")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle();

  // Siempre correr bcrypt para evitar timing attacks
  const dummyHash =
    "$2b$12$invalidhashpadding000000000000000000000000000000000000";
  const hashToCheck = user?.password_hash ?? dummyHash;
  const isValid = await bcrypt.compare(password, hashToCheck);

  if (error || !user || !isValid) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const token = await signSession({ userId: user.id, username: user.username });
  const response = NextResponse.json({
    userId: user.id,
    username: user.username,
    displayName: user.display_name,
    avatarKey: user.avatar_key,
  });
  response.cookies.set(makeSessionCookie(token));
  return response;
}

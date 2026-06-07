import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────

const checkRateLimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: () => checkRateLimit(),
  getIp: () => "1.2.3.4",
}));

const compare = vi.fn();
vi.mock("bcryptjs", () => ({ default: { compare: (...a: unknown[]) => compare(...a) } }));

vi.mock("@/lib/auth/session", () => ({
  signSession: vi.fn(async () => "signed-token"),
  makeSessionCookie: (token: string) => ({
    name: "session",
    value: token,
    httpOnly: true,
    path: "/",
  }),
}));

const maybeSingle = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => maybeSingle() }),
      }),
    }),
  }),
}));

import { POST } from "@/app/api/auth/login/route";

function login(body: unknown): Request {
  return new Request("https://prode.app/api/auth/login", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const dbUser = {
  id: "user-1",
  username: "santi",
  display_name: "Santi",
  avatar_key: "avatar-1",
  password_hash: "$2b$12$hash",
};

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimit.mockResolvedValue({ allowed: true });
  maybeSingle.mockResolvedValue({ data: dbUser, error: null });
  compare.mockResolvedValue(true);
});

describe("POST /api/auth/login", () => {
  it("429 si supera el rate limit", async () => {
    checkRateLimit.mockResolvedValue({ allowed: false });
    expect((await POST(login({ username: "santi", password: "x" }))).status).toBe(429);
  });

  it("400 si el body no es JSON válido", async () => {
    expect((await POST(login("{bad"))).status).toBe(400);
  });

  it("400 si faltan username/password", async () => {
    expect((await POST(login({ username: "santi" }))).status).toBe(400);
  });

  it("400 si los tipos son incorrectos", async () => {
    expect((await POST(login({ username: 1, password: 2 }))).status).toBe(400);
  });

  it("401 si el usuario no existe", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    compare.mockResolvedValue(false); // bcrypt contra dummy hash
    expect((await POST(login({ username: "nadie", password: "x" }))).status).toBe(401);
  });

  it("401 si la contraseña es incorrecta", async () => {
    compare.mockResolvedValue(false);
    expect((await POST(login({ username: "santi", password: "mala" }))).status).toBe(401);
  });

  it("siempre ejecuta bcrypt.compare aunque el usuario no exista (anti timing attack)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    compare.mockResolvedValue(false);
    await POST(login({ username: "nadie", password: "x" }));
    expect(compare).toHaveBeenCalledOnce();
  });

  it("200, setea cookie de sesión y devuelve el perfil con credenciales válidas", async () => {
    const res = await POST(login({ username: "santi", password: "buena" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      userId: "user-1",
      username: "santi",
      displayName: "Santi",
      avatarKey: "avatar-1",
    });
    expect(res.headers.get("set-cookie")).toContain("session=signed-token");
  });

  it("normaliza el username (lowercase + trim) — login válido igual", async () => {
    const res = await POST(login({ username: "  SANTI  ", password: "buena" }));
    expect(res.status).toBe(200);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SignJWT } from "jose";
import {
  signSession,
  verifySession,
  makeSessionCookie,
  makeClearCookie,
} from "@/lib/auth/session";

const SECRET = "test-secret-at-least-32-chars-long-xxxxx";
const payload = { userId: "user-1", username: "santi" };

describe("signSession / verifySession", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("roundtrip: firma y verifica devolviendo el payload", async () => {
    const token = await signSession(payload);
    expect(await verifySession(token)).toEqual(payload);
  });

  it("rechaza un token manipulado", async () => {
    const token = await signSession(payload);
    const tampered = token.slice(0, -3) + "abc";
    await expect(verifySession(tampered)).rejects.toThrow();
  });

  it("rechaza un token firmado con otro secret", async () => {
    const otherSecret = new TextEncoder().encode("another-secret-32-chars-minimum-yyyy");
    const foreign = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(otherSecret);
    await expect(verifySession(foreign)).rejects.toThrow();
  });

  it("rechaza un token expirado", async () => {
    const secret = new TextEncoder().encode(SECRET);
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 10)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // expiró hace 1 min
      .sign(secret);
    await expect(verifySession(expired)).rejects.toThrow();
  });

  it("rechaza payload sin userId/username válidos", async () => {
    const secret = new TextEncoder().encode(SECRET);
    const bad = await new SignJWT({ foo: "bar" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);
    await expect(verifySession(bad)).rejects.toThrow("Invalid session payload");
  });

  it("lanza si AUTH_SECRET no está seteado", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    await expect(signSession(payload)).rejects.toThrow(/AUTH_SECRET/);
  });

  it("lanza si AUTH_SECRET es demasiado corto (<32)", async () => {
    vi.stubEnv("AUTH_SECRET", "too-short");
    await expect(signSession(payload)).rejects.toThrow(/at least 32/);
  });
});

describe("cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("makeSessionCookie: httpOnly, sameSite lax, path /, maxAge 7 días", () => {
    const c = makeSessionCookie("token-abc");
    expect(c).toMatchObject({
      name: "session",
      value: "token-abc",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  });

  it("makeSessionCookie: secure=true en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(makeSessionCookie("t").secure).toBe(true);
  });

  it("makeSessionCookie: secure=false fuera de producción", () => {
    vi.stubEnv("NODE_ENV", "test");
    expect(makeSessionCookie("t").secure).toBe(false);
  });

  it("makeClearCookie: maxAge 0 y value vacío", () => {
    const c = makeClearCookie();
    expect(c).toMatchObject({ name: "session", value: "", maxAge: 0, httpOnly: true });
  });
});

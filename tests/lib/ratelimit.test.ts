import { describe, it, expect } from "vitest";
import { getIp } from "@/lib/ratelimit";

function req(headers: Record<string, string>): Request {
  return new Request("https://prode.app/api/x", { headers });
}

describe("getIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(getIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("recorta espacios alrededor de la IP", () => {
    expect(getIp(req({ "x-forwarded-for": "  9.9.9.9  , 1.1.1.1" }))).toBe("9.9.9.9");
  });

  it("usa x-real-ip si no hay x-forwarded-for", () => {
    expect(getIp(req({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("prefiere x-forwarded-for sobre x-real-ip", () => {
    expect(getIp(req({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("devuelve 'unknown' si no hay ningún header de IP", () => {
    expect(getIp(req({}))).toBe("unknown");
  });
});

import { Logger } from "@nestjs/common";
import { assertRequiredEnv } from "./env.check";

describe("assertRequiredEnv", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("does nothing outside production", () => {
    process.env.NODE_ENV = "development";
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  function validProdEnv() {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://real";
    process.env.JWT_ACCESS_SECRET = "a-real-access-secret";
    process.env.JWT_REFRESH_SECRET = "a-real-refresh-secret";
    process.env.CORS_ORIGINS = "https://example.com";
  }

  it("passes with a complete, non-placeholder, distinct-secrets config", () => {
    validProdEnv();
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  it("throws when a required variable is missing", () => {
    validProdEnv();
    delete process.env.DATABASE_URL;
    expect(() => assertRequiredEnv()).toThrow(/manquantes/);
  });

  it("throws when a dev placeholder secret is used in production", () => {
    validProdEnv();
    process.env.JWT_ACCESS_SECRET = "dev-access-secret-change-in-prod-1234567890";
    expect(() => assertRequiredEnv()).toThrow(/développement détectés/);
  });

  it("throws when JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical", () => {
    validProdEnv();
    process.env.JWT_REFRESH_SECRET = process.env.JWT_ACCESS_SECRET;
    expect(() => assertRequiredEnv()).toThrow(/distinctes/);
  });

  it("warns (but does not throw) when R2 is not configured — local disk storage does not survive redeploys", () => {
    validProdEnv();
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_PUBLIC_URL;
    const warnSpy = jest.spyOn(Logger, "warn").mockImplementation(() => undefined);
    expect(() => assertRequiredEnv()).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/R2 non configuré/), "Bootstrap");
    warnSpy.mockRestore();
  });

  it("does not warn about R2 when fully configured", () => {
    validProdEnv();
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.R2_BUCKET = "bucket";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_PUBLIC_URL = "https://cdn.example.com";
    const warnSpy = jest.spyOn(Logger, "warn").mockImplementation(() => undefined);
    assertRequiredEnv();
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringMatching(/R2 non configuré/), "Bootstrap");
    warnSpy.mockRestore();
  });
});

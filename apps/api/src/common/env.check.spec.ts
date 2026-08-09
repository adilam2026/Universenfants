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
});

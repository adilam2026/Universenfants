import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { runCatchingDuplicate } from "./prisma-errors.util";

// categories/brands/products/cities/coupons/landing-pages create()/update()
// avalaient tous auparavant une violation de contrainte unique (slug, SKU,
// nom, code...) en un 500 générique — ce helper centralise sa conversion en
// 400 explicite, testé une fois plutôt que ré-implémenté (et re-testé) à
// chaque endroit où il s'applique.
describe("runCatchingDuplicate", () => {
  it("returns the result unchanged when the operation succeeds", async () => {
    const result = await runCatchingDuplicate(() => Promise.resolve({ id: "abc" }), "duplicate");
    expect(result).toEqual({ id: "abc" });
  });

  it("converts a P2002 unique constraint violation into a friendly BadRequestException", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    await expect(runCatchingDuplicate(() => Promise.reject(p2002), "Ce code existe déjà")).rejects.toThrow(
      BadRequestException,
    );
    await expect(runCatchingDuplicate(() => Promise.reject(p2002), "Ce code existe déjà")).rejects.toThrow(
      "Ce code existe déjà",
    );
  });

  it("re-throws any other error unchanged", async () => {
    const other = new Error("something else entirely");
    await expect(runCatchingDuplicate(() => Promise.reject(other), "duplicate")).rejects.toBe(other);
  });

  it("re-throws a Prisma error with a different code unchanged", async () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "test" });
    await expect(runCatchingDuplicate(() => Promise.reject(p2025), "duplicate")).rejects.toBe(p2025);
  });
});

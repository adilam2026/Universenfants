import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import * as XLSX from "xlsx";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProductsService } from "../src/catalog/products/products.service";

// products.service.ts#importFromExcel appelait prisma.product.create/update
// directement dans la boucle par ligne, sans passer par runCatchingDuplicate
// (utilisé partout ailleurs pour les champs uniques) — une collision de SKU
// ou d'URL SEO avec un autre produit remontait donc l'erreur Prisma brute
// ("Invalid prisma.product.create()... Unique constraint failed...") dans
// la colonne "Erreur" du résumé d'import au lieu d'un message actionnable.
describe("Product Excel import — duplicate seoUrl error message (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let products: ProductsService;

  let categoryId: string;
  let categorySlug: string;
  let existingProductId: string;
  const seoUrl = `produit-collision-import-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    products = app.get(ProductsService);

    categorySlug = `test-import-collision-${Date.now()}`;
    const category = await prisma.category.create({ data: { nameFr: "Test import collision", slug: categorySlug } });
    categoryId = category.id;

    const existing = await prisma.product.create({
      data: {
        sku: `IMPORT-EXISTING-${Date.now()}`,
        nameFr: "Produit déjà existant",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl,
        stock: 5,
        status: "ACTIVE",
      },
    });
    existingProductId = existing.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { categoryId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("reports a legible error instead of a raw Prisma message when a row's seoUrl collides with a different product", async () => {
    const sheet = XLSX.utils.json_to_sheet([
      {
        SKU: `IMPORT-NEW-${Date.now()}`,
        Nom: "Nouveau produit en collision",
        Catégorie: categorySlug,
        Prix: 80,
        "Prix de revient": 40,
        "URL SEO": seoUrl, // collision volontaire avec existingProductId
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Produits");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const result = await products.importFromExcel(buffer);

    expect(result.errors).toBe(1);
    expect(result.results[0].status).toBe("error");
    expect(result.results[0].message).toBe("SKU ou URL SEO déjà utilisé par un autre produit");
    expect(result.results[0].message).not.toMatch(/Invalid `?prisma/i);
    expect(result.results[0].message).not.toMatch(/Unique constraint/i);

    void existingProductId;
  });
});

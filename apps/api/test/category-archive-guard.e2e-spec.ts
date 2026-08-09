import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CategoriesService } from "../src/catalog/categories/categories.service";

// categories.service.ts#archive changeait le statut sans jamais vérifier si
// des produits actifs pointaient encore vers cette catégorie — tree() (nav
// catégorie du Front) ne renvoie que les catégories ACTIVE, donc archiver
// une catégorie encore utilisée rendait ses produits injoignables par la
// navigation, sans le moindre avertissement à l'admin.
describe("Category archive guard (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let categories: CategoriesService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    categories = app.get(CategoriesService);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  it("refuses to archive a category still used by an active product", async () => {
    const category = await prisma.category.create({
      data: { nameFr: "Test archive catégorie", slug: `test-archive-cat-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        sku: `ARCHIVE-CAT-${Date.now()}`,
        nameFr: "Produit test archive catégorie",
        categoryId: category.id,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-archive-cat-${Date.now()}`,
        stock: 5,
        status: "ACTIVE",
      },
    });

    await expect(categories.archive(category.id)).rejects.toThrow(/produit\(s\) actif\(s\)/);

    await prisma.product.delete({ where: { id: product.id } });
    await prisma.category.delete({ where: { id: category.id } });
  });

  it("allows archiving once no active product references it", async () => {
    const category = await prisma.category.create({
      data: { nameFr: "Test archive catégorie vide", slug: `test-archive-cat-empty-${Date.now()}` },
    });

    const archived = await categories.archive(category.id);
    expect(archived.status).toBe("ARCHIVED");

    await prisma.category.delete({ where: { id: category.id } });
  });
});

import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProductsService } from "../src/catalog/products/products.service";
import { SearchService } from "../src/search/search.service";

// products.service.ts#list ne cherchait que sur nameFr quand Meilisearch est
// indisponible (searchProductIds() renvoie null), alors que Meilisearch lui-
// même indexe nameFr/nameAr/sku — une panne du moteur de recherche faisait
// donc disparaître silencieusement la recherche en arabe et par SKU, sans
// que la recherche en français cesse de fonctionner pour signaler le
// problème.
describe("Product search Postgres fallback (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let products: ProductsService;
  let search: SearchService;
  let originalSearchProductIds: SearchService["searchProductIds"];

  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    products = app.get(ProductsService);
    search = app.get(SearchService);

    const category = await prisma.category.create({
      data: { nameFr: "Test repli recherche", slug: `test-search-fallback-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `SEARCHFALLBACK-${Date.now()}`,
        nameFr: "Jouet en bois",
        nameAr: "لعبة خشبية فريدة",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `jouet-repli-recherche-${Date.now()}`,
        stock: 5,
        status: "ACTIVE",
      },
    });
    productId = product.id;

    // Simule une panne Meilisearch sans dépendre de l'infra réelle du moteur.
    originalSearchProductIds = search.searchProductIds.bind(search);
    search.searchProductIds = async () => null;
  }, 30_000);

  afterAll(async () => {
    search.searchProductIds = originalSearchProductIds;
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("still finds the product by its Arabic name during a Meilisearch outage", async () => {
    const result = await products.list({ q: "لعبة خشبية فريدة" } as never);
    expect(result.items.map((p: { id: string }) => p.id)).toContain(productId);
  });

  it("still finds the product by SKU during a Meilisearch outage", async () => {
    const result = await products.list({ q: "SEARCHFALLBACK" } as never);
    expect(result.items.map((p: { id: string }) => p.id)).toContain(productId);
  });

  it("still finds the product by its French name (baseline, unaffected by the fix)", async () => {
    const result = await products.list({ q: "Jouet en bois" } as never);
    expect(result.items.map((p: { id: string }) => p.id)).toContain(productId);
  });
});

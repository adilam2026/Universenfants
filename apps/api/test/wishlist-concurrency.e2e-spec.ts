import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { WishlistService } from "../src/wishlist/wishlist.service";

// wishlist.service.ts#add() lisait l'état existant (findFirst) puis créait
// la ligne dans deux requêtes séparées, sans contrainte d'unicité en base —
// deux ajouts RÉELLEMENT concurrents pour le même produit (double-clic sur
// le cœur, retry réseau) passaient tous les deux le findFirst() avant
// qu'aucun n'ait committé, créant chacun leur propre ligne : le produit
// apparaissait deux fois dans la liste de favoris. Corrigé par un upsert
// atomique appuyé sur la contrainte unique (wishlistId, productId).
describe("Wishlist add() concurrency (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let wishlist: WishlistService;

  let categoryId: string;
  let customerId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    wishlist = app.get(WishlistService);

    const category = await prisma.category.create({
      data: { nameFr: "Test course wishlist", slug: `test-wishlist-race-${Date.now()}` },
    });
    categoryId = category.id;

    const customer = await prisma.customer.create({ data: { firstName: "Course", lastName: "Wishlist" } });
    customerId = customer.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.wishlistLine.deleteMany({ where: { wishlist: { customerId } } });
    await prisma.wishlist.deleteMany({ where: { customerId } });
    await prisma.customer.delete({ where: { id: customerId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("never creates a duplicate line when the same product is added concurrently", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `WISHRACE-${Date.now()}`,
        nameFr: "Produit test course wishlist",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-wishlist-race-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });

    await Promise.all([wishlist.add(customerId, product.id), wishlist.add(customerId, product.id)]);

    const w = await prisma.wishlist.findUniqueOrThrow({ where: { customerId } });
    const linesForProduct = await prisma.wishlistLine.findMany({ where: { wishlistId: w.id, productId: product.id } });
    expect(linesForProduct).toHaveLength(1);

    const list = await wishlist.list(customerId);
    expect(list.filter((l) => l.productId === product.id)).toHaveLength(1);

    await prisma.wishlistLine.deleteMany({ where: { wishlistId: w.id, productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("still allows re-adding a product after it was removed (no stale unique-row conflict)", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `WISHRACE-READD-${Date.now()}`,
        nameFr: "Produit test ré-ajout wishlist",
        categoryId,
        price: 50,
        costPrice: 25,
        seoUrl: `produit-test-wishlist-readd-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });

    await wishlist.add(customerId, product.id);
    await wishlist.remove(customerId, product.id);
    const afterRemove = await wishlist.list(customerId);
    expect(afterRemove.find((l) => l.productId === product.id)).toBeUndefined();

    await wishlist.add(customerId, product.id);
    const afterReadd = await wishlist.list(customerId);
    expect(afterReadd.filter((l) => l.productId === product.id)).toHaveLength(1);

    const w = await prisma.wishlist.findUniqueOrThrow({ where: { customerId } });
    await prisma.wishlistLine.deleteMany({ where: { wishlistId: w.id, productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});

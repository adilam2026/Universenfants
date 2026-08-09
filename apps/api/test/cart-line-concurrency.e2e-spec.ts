import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartService } from "../src/cart/cart.service";

// cart.service.ts#addLine lisait l'état existant (findFirst) puis créait ou
// incrémentait dans deux requêtes séparées, sans protection contre la
// concurrence. Deux ajouts RÉELLEMENT concurrents du même produit (double-
// clic "ajouter au panier", naturel sur mobile) pouvaient tous deux voir
// "aucune ligne existante" avant qu'aucun n'ait committé, créant chacun leur
// propre ligne — le produit apparaissait deux fois dans le panier au lieu
// d'une seule ligne à quantité 2. Corrigé par un verrou consultatif Postgres
// scopé à (cartId, productId, variantId), qui sérialise même la toute
// première création (une contrainte unique classique ne le pourrait pas
// sans index partiel, variantId étant nullable).
describe("Cart addLine concurrency (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let cartService: CartService;

  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    cartService = app.get(CartService);

    const category = await prisma.category.create({
      data: { nameFr: "Test course panier", slug: `test-cart-race-${Date.now()}` },
    });
    categoryId = category.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("merges concurrent additions of the same product into a single line with the summed quantity", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `CARTRACE-${Date.now()}`,
        nameFr: "Produit test course panier",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-cart-race-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);

    await Promise.all([
      cartService.addLine(cart.id, { productId: product.id, quantity: 1 }),
      cartService.addLine(cart.id, { productId: product.id, quantity: 1 }),
    ]);

    const lines = await prisma.cartLine.findMany({ where: { cartId: cart.id, productId: product.id } });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);

    const fullCart = await cartService.getFullCart(cart.id);
    expect(fullCart.lines.filter((l) => l.productId === product.id)).toHaveLength(1);
    expect(fullCart.subtotal).toBe(200);

    await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("keeps different products as separate lines (lock is scoped per product/variant)", async () => {
    const productA = await prisma.product.create({
      data: {
        sku: `CARTRACE-A-${Date.now()}`,
        nameFr: "Produit A",
        categoryId,
        price: 50,
        costPrice: 25,
        seoUrl: `produit-a-cart-race-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    const productB = await prisma.product.create({
      data: {
        sku: `CARTRACE-B-${Date.now()}`,
        nameFr: "Produit B",
        categoryId,
        price: 30,
        costPrice: 15,
        seoUrl: `produit-b-cart-race-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);

    await Promise.all([
      cartService.addLine(cart.id, { productId: productA.id, quantity: 1 }),
      cartService.addLine(cart.id, { productId: productB.id, quantity: 1 }),
    ]);

    const lines = await prisma.cartLine.findMany({ where: { cartId: cart.id } });
    expect(lines).toHaveLength(2);

    await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
    await prisma.product.deleteMany({ where: { id: { in: [productA.id, productB.id] } } });
  });
});

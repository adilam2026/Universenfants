import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartService } from "../src/cart/cart.service";

// cart.service.ts#updateLine écrivait la quantité demandée sans jamais
// vérifier le stock disponible (contrairement au checkout, qui appelle
// reserveStock) — un client pouvait cliquer "+" au-delà du stock réel sans
// le moindre retour, et ne le découvrait qu'au moment du checkout.
describe("Cart updateLine stock check (e2e)", () => {
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
      data: { nameFr: "Test course panier stock", slug: `test-cart-stock-${Date.now()}` },
    });
    categoryId = category.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("rejects a quantity above the product's available stock", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `CARTQTY-${Date.now()}`,
        nameFr: "Produit test quantité panier",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-cart-qty-${Date.now()}`,
        stock: 3,
        status: "ACTIVE",
      },
    });
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    const full = await cartService.addLine(cart.id, { productId: product.id, quantity: 1 } as never);
    const line = await prisma.cartLine.findFirstOrThrow({ where: { cartId: cart.id, productId: product.id } });

    await expect(cartService.updateLine(cart.id, line.id, { quantity: 4 })).rejects.toThrow(/Stock insuffisant/);
    await expect(cartService.updateLine(cart.id, line.id, { quantity: 3 })).resolves.toBeTruthy();

    void full;
    await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("rejects a quantity above the selected variant's available stock, independent of the product's own stock", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `CARTQTY-VAR-${Date.now()}`,
        nameFr: "Produit test quantité variante",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-cart-qty-var-${Date.now()}`,
        stock: 999,
        status: "ACTIVE",
        variants: { create: { sku: `CARTQTY-VAR-V-${Date.now()}`, label: "Taille M", stock: 2 } },
      },
      include: { variants: true },
    });
    const variant = product.variants[0];
    const cart = await cartService.resolveCart(crypto.randomUUID(), null);
    await cartService.addLine(cart.id, { productId: product.id, variantId: variant.id, quantity: 1 } as never);
    const line = await prisma.cartLine.findFirstOrThrow({ where: { cartId: cart.id, variantId: variant.id } });

    await expect(cartService.updateLine(cart.id, line.id, { quantity: 3 })).rejects.toThrow(/Stock insuffisant/);

    await prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});

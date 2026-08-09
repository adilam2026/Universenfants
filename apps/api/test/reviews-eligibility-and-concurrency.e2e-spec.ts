import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ReviewsService } from "../src/reviews/reviews.service";

// reviews.service.ts n'avait aucune couverture e2e alors qu'il porte deux
// garanties métier sensibles : (§233) seuls les acheteurs ayant réellement
// reçu le produit peuvent laisser un avis, et (contrainte unique productId+
// customerId) un avis par client et par produit — y compris sous double
// soumission concurrente (deux onglets, double-clic), où la contrainte
// unique doit se traduire en 409 explicite plutôt qu'un 500 Prisma brut.
describe("Reviews eligibility and duplicate protection (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let reviews: ReviewsService;

  let categoryId: string;
  let productId: string;
  let buyerCustomerId: string;
  let nonBuyerCustomerId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    reviews = app.get(ReviewsService);

    const category = await prisma.category.create({
      data: { nameFr: "Test avis", slug: `test-reviews-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `REVIEW-${Date.now()}`,
        nameFr: "Produit test avis",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-avis-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    productId = product.id;

    const buyer = await prisma.customer.create({ data: { firstName: "Acheteur", lastName: "Vérifié" } });
    buyerCustomerId = buyer.id;
    const nonBuyer = await prisma.customer.create({ data: { firstName: "Non", lastName: "Acheteur" } });
    nonBuyerCustomerId = nonBuyer.id;

    const order = await prisma.order.create({
      data: {
        orderNumber: `REVIEW-TEST-${Date.now()}`,
        customerId: buyerCustomerId,
        subtotal: 100,
        shippingFee: 0,
        vatAmount: 0,
        total: 100,
        shippingCity: "Casablanca",
        shippingAddress: "1 rue du test",
        shippingPhone: "0600000000",
        status: "DELIVERED",
        lines: {
          create: {
            productId,
            productNameSnapshot: product.nameFr,
            skuSnapshot: product.sku,
            costPriceSnapshot: 50,
            sellPriceSnapshot: 100,
            quantity: 1,
            lineTotal: 100,
          },
        },
      },
    });
    orderId = order.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { productId } });
    await prisma.orderLine.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
    await prisma.customer.deleteMany({ where: { id: { in: [buyerCustomerId, nonBuyerCustomerId] } } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("reports eligibility correctly for a verified buyer vs. a non-buyer", async () => {
    const buyerEligibility = await reviews.eligibility(buyerCustomerId, productId);
    expect(buyerEligibility).toEqual({ canReview: true, alreadyReviewed: false });

    const nonBuyerEligibility = await reviews.eligibility(nonBuyerCustomerId, productId);
    expect(nonBuyerEligibility).toEqual({ canReview: false, alreadyReviewed: false });
  });

  it("rejects a review from a customer who never received the product (§233)", async () => {
    await expect(
      reviews.create(nonBuyerCustomerId, { productId, rating: 5, comment: "Je n'ai jamais acheté ce produit" }),
    ).rejects.toThrow(/reçu ce produit/);
  });

  it("accepts a review from the verified buyer, defaulting to PENDING moderation", async () => {
    const created = await reviews.create(buyerCustomerId, { productId, rating: 4, comment: "Très bon produit" });
    expect(created.status).toBe("PENDING");

    const eligibility = await reviews.eligibility(buyerCustomerId, productId);
    expect(eligibility).toEqual({ canReview: false, alreadyReviewed: true });
  });

  it("rejects a second review from the same buyer for the same product with a friendly 409", async () => {
    await expect(reviews.create(buyerCustomerId, { productId, rating: 2, comment: "Je change d'avis" })).rejects.toThrow(
      /déjà publié un avis/,
    );
  });

  it("only lets one of two truly concurrent duplicate submissions succeed (unique constraint race)", async () => {
    const secondProduct = await prisma.product.create({
      data: {
        sku: `REVIEW-RACE-${Date.now()}`,
        nameFr: "Produit test course avis",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-course-avis-${Date.now()}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
    const raceOrder = await prisma.order.create({
      data: {
        orderNumber: `REVIEW-RACE-${Date.now()}`,
        customerId: buyerCustomerId,
        subtotal: 100,
        shippingFee: 0,
        vatAmount: 0,
        total: 100,
        shippingCity: "Casablanca",
        shippingAddress: "1 rue du test",
        shippingPhone: "0600000000",
        status: "DELIVERED",
        lines: {
          create: {
            productId: secondProduct.id,
            productNameSnapshot: secondProduct.nameFr,
            skuSnapshot: secondProduct.sku,
            costPriceSnapshot: 50,
            sellPriceSnapshot: 100,
            quantity: 1,
            lineTotal: 100,
          },
        },
      },
    });

    const results = await Promise.allSettled([
      reviews.create(buyerCustomerId, { productId: secondProduct.id, rating: 5, comment: "Premier" }),
      reviews.create(buyerCustomerId, { productId: secondProduct.id, rating: 1, comment: "Deuxième" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

    const stored = await prisma.review.findMany({ where: { productId: secondProduct.id, customerId: buyerCustomerId } });
    expect(stored).toHaveLength(1);

    await prisma.review.deleteMany({ where: { productId: secondProduct.id } });
    await prisma.orderLine.deleteMany({ where: { orderId: raceOrder.id } });
    await prisma.order.delete({ where: { id: raceOrder.id } });
    await prisma.product.delete({ where: { id: secondProduct.id } });
  });
});

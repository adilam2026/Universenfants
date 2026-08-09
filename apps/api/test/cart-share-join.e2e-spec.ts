import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CartService } from "../src/cart/cart.service";

// Le lien de panier partagé (apps/web/src/app/[locale]/panier/page.tsx)
// s'appuyait sur cart.service.ts#share/joinShared/resolveCart sans jamais
// avoir été testé côté API — le bug frontend (shareToken jamais transmis à
// getCart) est passé inaperçu faute de couverture sur le contrat backend
// qu'il devait respecter.
describe("Cart share / join (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let cartService: CartService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    cartService = app.get(CartService);
  }, 30_000);

  afterAll(async () => {
    await app.close();
  }, 30_000);

  it("resolving with the shareToken returns the same cart, not a new one", async () => {
    const owner = await cartService.resolveCart(crypto.randomUUID(), null);
    const { shareToken } = await cartService.share(owner.id);

    const viaShareToken = await cartService.resolveCart(crypto.randomUUID(), null, shareToken);
    expect(viaShareToken.id).toBe(owner.id);

    await prisma.cart.update({ where: { id: owner.id }, data: { shareToken: null } });
  });

  it("joining a shared cart adds a participant visible on the full cart", async () => {
    const owner = await cartService.resolveCart(crypto.randomUUID(), null);
    const { shareToken } = await cartService.share(owner.id);

    await cartService.joinShared(shareToken, "amie@example.com");
    const full = await cartService.getFullCart(owner.id);
    expect(full.participants.map((p) => p.email)).toContain("amie@example.com");

    // Rejoindre deux fois avec le même email ne doit pas dupliquer le participant.
    await cartService.joinShared(shareToken, "amie@example.com");
    const afterSecondJoin = await cartService.getFullCart(owner.id);
    expect(afterSecondJoin.participants.filter((p) => p.email === "amie@example.com")).toHaveLength(1);

    await prisma.cartParticipant.deleteMany({ where: { cartId: owner.id } });
    await prisma.cart.update({ where: { id: owner.id }, data: { shareToken: null } });
  });
});

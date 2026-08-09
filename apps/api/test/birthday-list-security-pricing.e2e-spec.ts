import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { BirthdayListService } from "../src/birthday-list/birthday-list.service";
import { WishlistService } from "../src/wishlist/wishlist.service";

// Deux corrections vérifiées ici :
// 1. IDOR (sécurité) : birthday-list.service.ts#removeItem ne vérifiait que
//    la propriété de la LISTE passée en paramètre, puis supprimait l'item par
//    son seul id — un client possédant sa propre liste pouvait donc supprimer
//    l'item d'une liste appartenant à un autre client en devinant son itemId.
// 2. Prix affichés (cohérence avec le moteur de prix centralisé) : listes
//    d'anniversaire et wishlist lisaient product.promoPrice directement,
//    ignorant les promotions catégorie/marque/boutique actives.
describe("Birthday list security & pricing (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let birthdayLists: BirthdayListService;
  let wishlist: WishlistService;

  let categoryId: string;
  let customerAId: string;
  let customerBId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    birthdayLists = app.get(BirthdayListService);
    wishlist = app.get(WishlistService);

    const category = await prisma.category.create({
      data: { nameFr: "Test sécurité liste anniv", slug: `test-bday-security-${Date.now()}` },
    });
    categoryId = category.id;

    const customerA = await prisma.customer.create({ data: { firstName: "Client", lastName: "A" } });
    const customerB = await prisma.customer.create({ data: { firstName: "Client", lastName: "B" } });
    customerAId = customerA.id;
    customerBId = customerB.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.birthdayListItem.deleteMany({ where: { list: { customerId: { in: [customerAId, customerBId] } } } });
    await prisma.birthdayList.deleteMany({ where: { customerId: { in: [customerAId, customerBId] } } });
    await prisma.wishlistLine.deleteMany({ where: { wishlist: { customerId: { in: [customerAId, customerBId] } } } });
    await prisma.wishlist.deleteMany({ where: { customerId: { in: [customerAId, customerBId] } } });
    await prisma.customer.deleteMany({ where: { id: { in: [customerAId, customerBId] } } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  async function createProduct(price: number, promoPrice: number | null) {
    return prisma.product.create({
      data: {
        sku: `BDAY-SEC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        nameFr: "Produit test liste anniversaire",
        categoryId,
        price,
        promoPrice,
        costPrice: Math.round(price / 2),
        seoUrl: `produit-test-bday-security-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        stock: 20,
        status: "ACTIVE",
      },
    });
  }

  it("rejects deleting another customer's birthday-list item, even from a list the caller owns", async () => {
    const product = await createProduct(100, null);
    const listA = await birthdayLists.create(customerAId, { childName: "Enfant A", eventDate: new Date().toISOString() });
    const listB = await birthdayLists.create(customerBId, { childName: "Enfant B", eventDate: new Date().toISOString() });
    await birthdayLists.addItem(customerBId, listB.id, product.id);
    const [refreshedB] = await birthdayLists.listMine(customerBId);
    const victimItemId = refreshedB.items[0].id;

    // Client A possède bien listA, mais tente de supprimer un item de listB.
    await expect(birthdayLists.removeItem(customerAId, listA.id, victimItemId)).rejects.toThrow(/introuvable/);

    const [stillThereB] = await birthdayLists.listMine(customerBId);
    expect(stillThereB.items).toHaveLength(1);

    await prisma.birthdayListItem.deleteMany({ where: { listId: { in: [listA.id, listB.id] } } });
    await prisma.birthdayList.deleteMany({ where: { id: { in: [listA.id, listB.id] } } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("resolves the birthday-list item price through the centralized pricing engine (listMine and getShared)", async () => {
    const product = await createProduct(200, null);
    const categoryPromo = await prisma.promotion.create({
      data: {
        name: "Promo catégorie liste anniv",
        type: "FIXED_AMOUNT",
        value: 40,
        scope: "CATEGORY",
        categoryId,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });

    const list = await birthdayLists.create(customerAId, { childName: "Enfant A", eventDate: new Date().toISOString() });
    await birthdayLists.addItem(customerAId, list.id, product.id);

    const [mine] = await birthdayLists.listMine(customerAId);
    expect(Number(mine.items[0].product.promoPrice)).toBe(160); // 200 - 40, pas le promoPrice brut (null) du produit

    const shared = await birthdayLists.getShared(list.shareToken);
    expect(Number(shared.items[0].product.promoPrice)).toBe(160);

    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await prisma.birthdayListItem.deleteMany({ where: { listId: list.id } });
    await prisma.birthdayList.delete({ where: { id: list.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("resolves the wishlist price through the centralized pricing engine", async () => {
    const product = await createProduct(200, 150);
    const categoryPromo = await prisma.promotion.create({
      data: {
        name: "Promo catégorie wishlist",
        type: "FIXED_AMOUNT",
        value: 70,
        scope: "CATEGORY",
        categoryId,
        status: "ACTIVE",
        startAt: new Date(Date.now() - 86_400_000),
        endAt: new Date(Date.now() + 86_400_000),
      },
    });

    await wishlist.add(customerAId, product.id);
    const lines = await wishlist.list(customerAId);
    expect(lines.find((l) => l.productId === product.id)?.price).toBe(130); // 200-70 bat le promoPrice produit (150)

    await prisma.promotion.delete({ where: { id: categoryPromo.id } });
    await wishlist.remove(customerAId, product.id);
    await prisma.product.delete({ where: { id: product.id } });
  });
});

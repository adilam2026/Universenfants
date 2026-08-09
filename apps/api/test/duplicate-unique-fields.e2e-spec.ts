import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { CategoriesService } from "../src/catalog/categories/categories.service";
import { BrandsService } from "../src/catalog/brands/brands.service";
import { ProductsService } from "../src/catalog/products/products.service";
import { CitiesService } from "../src/cities/cities.service";
import { LandingPagesService } from "../src/landing-pages/landing-pages.service";

// categories/brands/products/variantes/villes/landing-pages create()/update()
// laissaient tous auparavant une violation de contrainte unique (slug, SKU,
// nom, code...) remonter en 500 générique (message "Erreur interne", capturé
// par le filtre d'exceptions global) au lieu d'un 400 explicite — un admin
// resaisissant simplement un slug déjà pris n'avait aucune indication claire
// de la cause. Corrigé via un helper partagé (runCatchingDuplicate,
// common/prisma-errors.util.ts) appliqué à chaque point d'entrée concerné.
describe("Duplicate unique fields return a friendly 400 (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let categories: CategoriesService;
  let brands: BrandsService;
  let products: ProductsService;
  let cities: CitiesService;
  let landingPages: LandingPagesService;

  let categoryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    categories = app.get(CategoriesService);
    brands = app.get(BrandsService);
    products = app.get(ProductsService);
    cities = app.get(CitiesService);
    landingPages = app.get(LandingPagesService);

    const category = await prisma.category.create({
      data: { nameFr: "Test doublons", slug: `test-duplicates-${Date.now()}` },
    });
    categoryId = category.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("rejects a duplicate category slug with a friendly 400 instead of a raw 500", async () => {
    const slug = `dup-cat-${Date.now()}`;
    await categories.create({ nameFr: "A", slug } as never);
    await expect(categories.create({ nameFr: "B", slug } as never)).rejects.toThrow(/déjà utilisée/);
    await prisma.category.delete({ where: { slug } });
  });

  it("rejects a duplicate brand name/slug with a friendly 400", async () => {
    const slug = `dup-brand-${Date.now()}`;
    await brands.create({ name: "Marque Test", slug } as never);
    await expect(brands.create({ name: "Marque Test", slug: `${slug}-2` } as never)).rejects.toThrow(/existe déjà/);
    await prisma.brand.delete({ where: { slug } });
  });

  it("rejects a duplicate product SKU with a friendly 400", async () => {
    const sku = `DUP-SKU-${Date.now()}`;
    const data = {
      sku,
      nameFr: "Produit doublon",
      categoryId,
      price: 100,
      costPrice: 50,
      stock: 10,
      status: "ACTIVE",
    };
    await products.create({ ...data, seoUrl: `dup-product-a-${Date.now()}` } as never);
    await expect(products.create({ ...data, seoUrl: `dup-product-b-${Date.now()}` } as never)).rejects.toThrow(
      /existe déjà/,
    );
    await prisma.product.deleteMany({ where: { sku } });
  });

  it("rejects a duplicate variant SKU with a friendly 400", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `DUP-VARIANT-HOST-${Date.now()}`,
        nameFr: "Produit hôte variante",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `dup-variant-host-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });
    const variantSku = `DUP-VARIANT-${Date.now()}`;
    await products.addVariant(product.id, { sku: variantSku, label: "Taille M", stock: 5 } as never);
    await expect(products.addVariant(product.id, { sku: variantSku, label: "Taille L", stock: 5 } as never)).rejects.toThrow(
      /existe déjà/,
    );
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });

  it("rejects a duplicate city name with a friendly 400", async () => {
    const name = `Ville Doublon ${Date.now()}`;
    await cities.create({ name, shippingFee: 20 } as never);
    await expect(cities.create({ name, shippingFee: 30 } as never)).rejects.toThrow(/existe déjà/);
    await prisma.city.delete({ where: { name } });
  });

  it("rejects a duplicate landing page slug with a friendly 400", async () => {
    const product = await prisma.product.create({
      data: {
        sku: `DUP-LP-HOST-${Date.now()}`,
        nameFr: "Produit landing page",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `dup-lp-host-${Date.now()}`,
        stock: 10,
        status: "ACTIVE",
      },
    });
    const slug = `dup-lp-${Date.now()}`;
    const base = {
      name: "Landing test",
      productId: product.id,
      template: "classic",
      theme: "universenfants",
      blocks: [],
    };
    const created = await landingPages.create({ ...base, slug } as never);
    await expect(landingPages.create({ ...base, slug } as never)).rejects.toThrow(/déjà utilisée/);

    await prisma.landingPage.delete({ where: { id: created.id } });
    await prisma.product.delete({ where: { id: product.id } });
  });
});

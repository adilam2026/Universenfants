import { Test } from "@nestjs/testing";
import type { INestApplicationContext } from "@nestjs/common";
import sharp from "sharp";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProductsService } from "../src/catalog/products/products.service";
import { ImageService } from "../src/storage/image.service";

// products.service.ts#addImage uploadait le fichier vers le stockage AVANT
// d'insérer la ligne ProductImage — deux opérations non transactionnelles.
// Si l'insertion DB échouait après un upload réussi, le fichier restait
// orphelin dans le stockage indéfiniment, sans jamais être nettoyé.
describe("Product image upload — orphaned file cleanup on DB failure (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let products: ProductsService;
  let images: ImageService;

  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    products = app.get(ProductsService);
    images = app.get(ImageService);

    const category = await prisma.category.create({
      data: { nameFr: "Test orphan image", slug: `test-orphan-image-${Date.now()}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        sku: `ORPHAN-IMG-${Date.now()}`,
        nameFr: "Produit test image orpheline",
        categoryId,
        price: 100,
        costPrice: 50,
        seoUrl: `produit-test-orphan-image-${Date.now()}`,
        stock: 5,
        status: "ACTIVE",
      },
    });
    productId = product.id;
  }, 30_000);

  afterAll(async () => {
    await prisma.productImage.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });
    await prisma.category.delete({ where: { id: categoryId } });
    await app.close();
  }, 30_000);

  it("removes the just-uploaded file from storage when the DB insert fails", async () => {
    const removeSpy = jest.spyOn(images, "remove");
    const originalCreate = prisma.productImage.create.bind(prisma.productImage);
    prisma.productImage.create = (() => {
      throw new Error("Panne DB simulée");
    }) as never;

    const pngBuffer = await sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } } })
      .png()
      .toBuffer();

    try {
      await expect(products.addImage(productId, pngBuffer)).rejects.toThrow("Panne DB simulée");
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(typeof removeSpy.mock.calls[0][0]).toBe("string");

      const remaining = await prisma.productImage.findMany({ where: { productId } });
      expect(remaining).toHaveLength(0);
    } finally {
      prisma.productImage.create = originalCreate;
      removeSpy.mockRestore();
    }
  });
});

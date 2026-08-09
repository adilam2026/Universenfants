import { SearchService, type ProductSearchDoc } from "./search.service";

// reindexSearch()/importFromExcel() (products.service.ts) se fient à la
// valeur de retour d'indexProducts()/indexProduct() pour savoir si l'index
// Meilisearch reflète vraiment le catalogue. Avant ce correctif, ces méthodes
// avalaient toute erreur d'écriture (moteur indisponible, panne disque côté
// Meilisearch...) et ne renvoyaient rien, faisant croire à un succès même
// quand l'index restait vide ou désynchronisé.
describe("SearchService", () => {
  const doc: ProductSearchDoc = {
    id: "p1",
    nameFr: "Produit",
    nameAr: null,
    sku: "SKU1",
    shortDescFr: null,
    categorySlug: "cat",
    categoryNameFr: "Cat",
    brandName: null,
    price: 100,
    promoPrice: null,
    ageMin: null,
    ageMax: null,
    status: "ACTIVE",
    createdAt: Date.now(),
    bestsellerScore: 0,
  };

  function buildService(client: { health: () => Promise<unknown>; index: () => unknown }) {
    return new SearchService(client as never);
  }

  it("reports failure without throwing when Meilisearch is unavailable at startup", async () => {
    const service = buildService({ health: () => Promise.reject(new Error("connection refused")), index: () => ({}) });
    await service.onModuleInit();

    expect(await service.indexProducts([doc])).toBe(false);
    expect(await service.indexProduct(doc)).toBe(false);
  });

  it("reports success when the write is accepted by Meilisearch", async () => {
    const index = { updateSettings: () => Promise.resolve(), addDocuments: () => Promise.resolve({ taskUid: 1 }) };
    const service = buildService({ health: () => Promise.resolve({ status: "available" }), index: () => index });
    await service.onModuleInit();

    expect(await service.indexProducts([doc])).toBe(true);
  });

  it("reports failure (instead of throwing) when the write itself fails after startup succeeded", async () => {
    const index = {
      updateSettings: () => Promise.resolve(),
      addDocuments: () => Promise.reject(new Error("No such file or directory (os error 2)")),
    };
    const service = buildService({ health: () => Promise.resolve({ status: "available" }), index: () => index });
    await service.onModuleInit();

    await expect(service.indexProducts([doc])).resolves.toBe(false);
    await expect(service.indexProduct(doc)).resolves.toBe(false);
  });

  it("treats an empty batch as trivially successful", async () => {
    const index = { updateSettings: () => Promise.resolve(), addDocuments: () => Promise.reject(new Error("should not be called")) };
    const service = buildService({ health: () => Promise.resolve({ status: "available" }), index: () => index });
    await service.onModuleInit();

    expect(await service.indexProducts([])).toBe(true);
  });
});

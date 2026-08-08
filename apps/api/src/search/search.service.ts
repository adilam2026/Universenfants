import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { MeiliSearch } from "meilisearch";
import { MEILISEARCH_CLIENT } from "./search.constants";

export const PRODUCTS_INDEX = "products";

export interface ProductSearchDoc {
  id: string;
  nameFr: string;
  nameAr: string | null;
  sku: string;
  shortDescFr: string | null;
  categorySlug: string;
  categoryNameFr: string;
  brandName: string | null;
  price: number;
  promoPrice: number | null;
  ageMin: number | null;
  ageMax: number | null;
  status: string;
  createdAt: number;
  bestsellerScore: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private available = false;

  constructor(@Inject(MEILISEARCH_CLIENT) private readonly client: MeiliSearch) {}

  async onModuleInit() {
    try {
      await this.client.health();
      const index = this.client.index(PRODUCTS_INDEX);
      await index.updateSettings({
        searchableAttributes: ["nameFr", "nameAr", "sku", "shortDescFr", "categoryNameFr", "brandName"],
        filterableAttributes: ["status", "categorySlug", "ageMin", "ageMax", "price", "promoPrice"],
        sortableAttributes: ["price", "createdAt", "bestsellerScore"],
      });
      this.available = true;
      this.logger.log("Meilisearch connected and index configured");
    } catch (err) {
      this.available = false;
      this.logger.warn(`Meilisearch unavailable, falling back to database search: ${(err as Error).message}`);
    }
  }

  isAvailable() {
    return this.available;
  }

  async indexProduct(doc: ProductSearchDoc) {
    if (!this.available) return;
    await this.client.index(PRODUCTS_INDEX).addDocuments([doc]).catch((err) => this.logger.warn(`indexProduct failed: ${err.message}`));
  }

  async indexProducts(docs: ProductSearchDoc[]) {
    if (!this.available || docs.length === 0) return;
    await this.client.index(PRODUCTS_INDEX).addDocuments(docs).catch((err) => this.logger.warn(`indexProducts failed: ${err.message}`));
  }

  async removeProduct(id: string) {
    if (!this.available) return;
    await this.client.index(PRODUCTS_INDEX).deleteDocument(id).catch((err) => this.logger.warn(`removeProduct failed: ${err.message}`));
  }

  /** Retourne les IDs produits correspondant à la requête, classés par pertinence Meilisearch (typo-tolerant). */
  async searchProductIds(q: string, limit = 200): Promise<string[] | null> {
    if (!this.available) return null;
    try {
      const result = await this.client.index(PRODUCTS_INDEX).search(q, {
        limit,
        filter: "status = ACTIVE",
        attributesToRetrieve: ["id"],
      });
      return result.hits.map((h) => (h as { id: string }).id);
    } catch (err) {
      this.logger.warn(`search failed: ${(err as Error).message}`);
      return null;
    }
  }
}

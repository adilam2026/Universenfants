import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateReviewDto } from "./dto/create-review.dto";
import type { ModerateReviewDto } from "./dto/moderate-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** §233 : seuls les acheteurs vérifiés (commande livrée) peuvent publier un avis. */
  async create(customerId: string, dto: CreateReviewDto) {
    const deliveredPurchase = await this.prisma.orderLine.findFirst({
      where: { productId: dto.productId, order: { customerId, status: "DELIVERED" } },
    });
    if (!deliveredPurchase) {
      throw new ForbiddenException("Seuls les clients ayant reçu ce produit peuvent laisser un avis");
    }

    const existing = await this.prisma.review.findUnique({
      where: { productId_customerId: { productId: dto.productId, customerId } },
    });
    if (existing) throw new ConflictException("Vous avez déjà publié un avis pour ce produit");

    // §234 : modération avant publication — statut PENDING par défaut (schema).
    // La contrainte unique (productId, customerId) protège déjà l'intégrité
    // en cas de double-soumission concurrente (deux onglets, double-clic) —
    // sans ce catch, la seconde requête remonterait un 500 Prisma brut au
    // lieu du même 409 explicite que la vérification ci-dessus.
    try {
      return await this.prisma.review.create({
        data: { productId: dto.productId, customerId, rating: dto.rating, comment: dto.comment },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("Vous avez déjà publié un avis pour ce produit");
      }
      throw err;
    }
  }

  listForAdmin(status?: string) {
    return this.prisma.review.findMany({
      where: status ? { status: status as never } : undefined,
      include: { product: { select: { nameFr: true, seoUrl: true } }, customer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async moderate(id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Avis introuvable");
    return this.prisma.review.update({
      where: { id },
      data: { status: dto.status, adminReply: dto.adminReply },
    });
  }

  /** Permet au front d'afficher "vous pouvez laisser un avis" sans exposer les autres statuts. */
  async eligibility(customerId: string, productId: string) {
    const [purchased, existing] = await Promise.all([
      this.prisma.orderLine.findFirst({ where: { productId, order: { customerId, status: "DELIVERED" } } }),
      this.prisma.review.findUnique({ where: { productId_customerId: { productId, customerId } } }),
    ]);
    return { canReview: Boolean(purchased) && !existing, alreadyReviewed: Boolean(existing) };
  }
}

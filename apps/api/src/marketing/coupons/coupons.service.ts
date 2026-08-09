import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { UpsertCouponDto } from "./dto/upsert-coupon.dto";

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  // coupon-discount.util.ts calcule value% du sous-total sans plafond — sans
  // cette validation, une saisie erronée (ex : 150 au lieu de 15) donnerait
  // une remise supérieure au panier, silencieusement ramenée à 0 DH au lieu
  // d'être rejetée à la création.
  private assertValidValue(dto: UpsertCouponDto) {
    if (dto.type === "PERCENTAGE" && dto.value > 100) {
      throw new BadRequestException("Une remise en pourcentage ne peut pas dépasser 100 %");
    }
  }

  async create(dto: UpsertCouponDto) {
    this.assertValidValue(dto);
    try {
      return await this.prisma.coupon.create({
        data: {
          code: dto.code.toUpperCase(),
          type: dto.type,
          value: dto.value,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          maxUses: dto.maxUses,
          maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
          minCartAmount: dto.minCartAmount ?? 0,
          status: dto.status ?? "ACTIVE",
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Ce code promotionnel existe déjà");
      }
      throw err;
    }
  }

  async update(id: string, dto: UpsertCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon introuvable");
    this.assertValidValue(dto);
    try {
      return await this.prisma.coupon.update({
        where: { id },
        data: {
          code: dto.code.toUpperCase(),
          type: dto.type,
          value: dto.value,
          startAt: new Date(dto.startAt),
          endAt: new Date(dto.endAt),
          maxUses: dto.maxUses,
          maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
          minCartAmount: dto.minCartAmount ?? 0,
          status: dto.status ?? existing.status,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Ce code promotionnel existe déjà");
      }
      throw err;
    }
  }
}

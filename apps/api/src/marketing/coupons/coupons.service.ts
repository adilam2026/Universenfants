import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditLogService } from "../../common/audit-log.service";
import { resolveDateRange } from "../date-range.util";
import type { UpsertCouponDto } from "./dto/upsert-coupon.dto";

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

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

  async create(dto: UpsertCouponDto, staffUserId: string) {
    this.assertValidValue(dto);
    const { startAt, endAt } = resolveDateRange(dto.startAt, dto.endAt);
    const data = {
      code: dto.code.toUpperCase(),
      type: dto.type,
      value: dto.value,
      startAt,
      endAt,
      maxUses: dto.maxUses,
      maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
      minCartAmount: dto.minCartAmount ?? 0,
      status: dto.status ?? "ACTIVE",
    };
    try {
      // Écriture atomique avec sa trace d'audit (§ Back-Office — impact direct
      // sur les remises accordées aux clients) : soit les deux persistent,
      // soit aucune, plutôt que deux écritures indépendantes pouvant diverger.
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.coupon.create({ data });
        await this.auditLog.record(
          { staffUserId, action: "coupon.create", entity: "Coupon", entityId: created.id, newValue: data },
          tx,
        );
        return created;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Ce code promotionnel existe déjà");
      }
      throw err;
    }
  }

  async update(id: string, dto: UpsertCouponDto, staffUserId: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Coupon introuvable");
    this.assertValidValue(dto);
    const { startAt, endAt } = resolveDateRange(dto.startAt, dto.endAt);
    const data = {
      code: dto.code.toUpperCase(),
      type: dto.type,
      value: dto.value,
      startAt,
      endAt,
      maxUses: dto.maxUses,
      maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
      minCartAmount: dto.minCartAmount ?? 0,
      status: dto.status ?? existing.status,
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.coupon.update({ where: { id }, data });
        await this.auditLog.record(
          { staffUserId, action: "coupon.update", entity: "Coupon", entityId: id, oldValue: existing, newValue: data },
          tx,
        );
        return updated;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new BadRequestException("Ce code promotionnel existe déjà");
      }
      throw err;
    }
  }
}

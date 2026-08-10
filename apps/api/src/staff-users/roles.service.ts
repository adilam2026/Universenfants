import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PermissionCode } from "@universenfants/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import { runCatchingDuplicate } from "../common/prisma-errors.util";
import type { CreateRoleDto } from "./dto/create-role.dto";
import type { UpsertRoleDto } from "./dto/upsert-role.dto";

/** CRUD des rôles — jusqu'ici figés au contenu du script de seed, sans
 * aucune route pour créer un rôle personnalisé ou modifier les permissions
 * d'un rôle existant depuis le Back-Office. */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, _count: { select: { staffUsers: true } } },
      orderBy: { name: "asc" },
    });
  }

  /** Catalogue fixe des permissions (enum PermissionCode) — sert à peupler
   * les cases à cocher du formulaire de rôle, groupées par domaine. */
  listPermissions() {
    return Object.values(PermissionCode).map((code) => ({ code, domain: code.split(".")[0] }));
  }

  async create(dto: CreateRoleDto, staffUserId: string) {
    this.assertValidCodes(dto.permissionCodes);
    const permissions = await this.prisma.permission.findMany({ where: { code: { in: dto.permissionCodes } } });
    const created = await runCatchingDuplicate(
      () =>
        this.prisma.role.create({
          data: { code: dto.code, name: dto.name, permissions: { create: permissions.map((p) => ({ permissionId: p.id })) } },
          include: { permissions: { include: { permission: true } } },
        }),
      "Un rôle avec ce code existe déjà",
    );
    await this.auditLog.record({ staffUserId, action: "role.create", entity: "Role", entityId: created.id, newValue: dto });
    return created;
  }

  async update(id: string, dto: UpsertRoleDto, staffUserId: string) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Rôle introuvable");
    this.assertValidCodes(dto.permissionCodes);
    const permissions = await this.prisma.permission.findMany({ where: { code: { in: dto.permissionCodes } } });

    // Remplace l'ensemble des permissions du rôle plutôt que de calculer un
    // diff — plus simple et sans risque d'incohérence, le volume par rôle
    // reste de l'ordre de la dizaine de lignes.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      return tx.role.update({
        where: { id },
        data: { name: dto.name, permissions: { create: permissions.map((p) => ({ permissionId: p.id })) } },
        include: { permissions: { include: { permission: true } } },
      });
    });
    await this.auditLog.record({ staffUserId, action: "role.update", entity: "Role", entityId: id, newValue: dto });
    return updated;
  }

  async remove(id: string, staffUserId: string) {
    const existing = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { staffUsers: true } } } });
    if (!existing) throw new NotFoundException("Rôle introuvable");
    if (existing.code === "SUPER_ADMIN") throw new BadRequestException("Le rôle Super Administrateur ne peut pas être supprimé");
    if (existing._count.staffUsers > 0) {
      throw new BadRequestException(`Impossible de supprimer : ${existing._count.staffUsers} membre(s) du staff ont encore ce rôle`);
    }
    await this.prisma.role.delete({ where: { id } });
    await this.auditLog.record({ staffUserId, action: "role.delete", entity: "Role", entityId: id, oldValue: { code: existing.code, name: existing.name } });
    return { ok: true };
  }

  private assertValidCodes(codes: string[]) {
    const valid = new Set<string>(Object.values(PermissionCode));
    const invalid = codes.filter((c) => !valid.has(c));
    if (invalid.length > 0) throw new BadRequestException(`Code(s) de permission invalide(s) : ${invalid.join(", ")}`);
  }
}

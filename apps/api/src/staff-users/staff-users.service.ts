import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/audit-log.service";
import { hashPassword } from "../auth/password.util";
import { runCatchingDuplicate } from "../common/prisma-errors.util";
import type { CreateStaffUserDto } from "./dto/create-staff-user.dto";
import type { UpdateStaffUserDto } from "./dto/update-staff-user.dto";
import type { ResetStaffPasswordDto } from "./dto/reset-staff-password.dto";

/** CRUD des comptes staff — jusqu'ici entièrement absent : le seul compte
 * existant était celui créé par le script de seed, sans aucun moyen d'en
 * ajouter un second depuis l'application. */
@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  list() {
    return this.prisma.staffUser.findMany({
      select: { id: true, name: true, email: true, active: true, lastLoginAt: true, role: { select: { id: true, name: true, code: true } } },
      orderBy: { name: "asc" },
    });
  }

  async create(dto: CreateStaffUserDto, staffUserId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException("Rôle introuvable");

    const created = await runCatchingDuplicate(
      async () =>
        this.prisma.staffUser.create({
          data: { name: dto.name, email: dto.email, passwordHash: await hashPassword(dto.password), roleId: dto.roleId },
          select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true, code: true } } },
        }),
      "Un compte staff avec cet email existe déjà",
    );
    await this.auditLog.record({ staffUserId, action: "staffUser.create", entity: "StaffUser", entityId: created.id, newValue: { name: dto.name, email: dto.email, roleId: dto.roleId } });
    return created;
  }

  async update(id: string, dto: UpdateStaffUserDto, actingStaffUserId: string) {
    const existing = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Compte staff introuvable");

    // Se désactiver soi-même via cet écran couperait immédiatement l'accès
    // qui permet de l'utiliser — utiliser un autre compte administrateur
    // pour ça, jamais son propre écran "Équipe".
    if (dto.active === false && id === actingStaffUserId) {
      throw new ForbiddenException("Vous ne pouvez pas désactiver votre propre compte");
    }
    if (dto.active === false) {
      const role = await this.prisma.role.findUnique({ where: { id: existing.roleId } });
      if (role?.code === "SUPER_ADMIN") {
        const activeSuperAdmins = await this.prisma.staffUser.count({ where: { roleId: existing.roleId, active: true } });
        if (activeSuperAdmins <= 1) {
          throw new BadRequestException("Impossible de désactiver le dernier compte Super Administrateur actif");
        }
      }
    }
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) throw new BadRequestException("Rôle introuvable");
    }

    const updated = await this.prisma.staffUser.update({
      where: { id },
      data: { name: dto.name, roleId: dto.roleId, active: dto.active },
      select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true, code: true } } },
    });
    await this.auditLog.record({ staffUserId: actingStaffUserId, action: "staffUser.update", entity: "StaffUser", entityId: id, oldValue: { roleId: existing.roleId, active: existing.active }, newValue: dto });
    return updated;
  }

  async resetPassword(id: string, dto: ResetStaffPasswordDto, actingStaffUserId: string) {
    const existing = await this.prisma.staffUser.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Compte staff introuvable");
    await this.prisma.staffUser.update({ where: { id }, data: { passwordHash: await hashPassword(dto.newPassword) } });
    // Comme StaffAuthService#changePassword : un mot de passe réinitialisé
    // par un administrateur doit invalider les sessions existantes (ex:
    // appareil perdu), pas seulement le prochain login.
    await this.prisma.refreshToken.updateMany({ where: { subjectId: id, kind: "staff", revokedAt: null }, data: { revokedAt: new Date() } });
    await this.auditLog.record({ staffUserId: actingStaffUserId, action: "staffUser.resetPassword", entity: "StaffUser", entityId: id });
    return { ok: true };
  }
}

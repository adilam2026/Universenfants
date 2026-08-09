import { PermissionCode } from "@universenfants/shared";
import type { PrismaService } from "../prisma/prisma.service";

/**
 * Résout l'ensemble effectif de permissions d'un StaffUser : celles de son
 * rôle, plus les octrois complémentaires, moins les restrictions explicites
 * (§171). SUPER_ADMIN a toujours accès total (§172). Partagé entre
 * PermissionsGuard (vérification serveur, seule source de vérité) et
 * StaffAuthService (pour que le Front sache quoi afficher/masquer sans
 * attendre un 403) — les deux doivent rester identiques.
 */
export async function resolveStaffPermissions(
  prisma: PrismaService,
  staffId: string,
): Promise<{ roleCode: string; permissions: PermissionCode[] } | null> {
  const staff = await prisma.staffUser.findUnique({
    where: { id: staffId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      extraPermissions: { include: { permission: true } },
    },
  });
  if (!staff || !staff.active) return null;

  if (staff.role.code === "SUPER_ADMIN") {
    return { roleCode: staff.role.code, permissions: Object.values(PermissionCode) };
  }

  const granted = new Set<string>(staff.role.permissions.map((rp) => rp.permission.code));
  for (const extra of staff.extraPermissions) {
    if (extra.granted) granted.add(extra.permission.code);
    else granted.delete(extra.permission.code);
  }
  return { roleCode: staff.role.code, permissions: [...granted] as PermissionCode[] };
}

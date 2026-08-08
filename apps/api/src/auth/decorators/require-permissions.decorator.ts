import { SetMetadata } from "@nestjs/common";
import type { PermissionCode } from "@universenfants/shared";

export const PERMISSIONS_KEY = "required_permissions";

/** Déclare les permissions requises (§180) — vérifiées par PermissionsGuard. */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

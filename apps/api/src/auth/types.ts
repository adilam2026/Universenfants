export type AuthKind = "customer" | "staff";

export interface JwtPayload {
  sub: string;
  kind: AuthKind;
  email?: string | null;
  roleCode?: string; // staff only
}

export interface RequestUser extends JwtPayload {}

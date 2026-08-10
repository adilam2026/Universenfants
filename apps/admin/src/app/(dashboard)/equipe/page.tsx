"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listStaffUsers,
  createStaffUser,
  updateStaffUser,
  resetStaffPassword,
  listRoles,
  type AdminStaffUser,
  type AdminRole,
} from "@/lib/staff-users";
import { ApiError } from "@/lib/api-client";
import { useStaffUser } from "@/hooks/use-staff-user";

export default function TeamPage() {
  const currentUser = useStaffUser();
  const [staff, setStaff] = useState<AdminStaffUser[] | null>(null);
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function refresh() {
    listStaffUsers().then(setStaff);
    listRoles().then(setRoles);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await createStaffUser({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        roleId: String(form.get("roleId")),
      });
      formEl.reset();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(user: AdminStaffUser, roleId: string, active: boolean) {
    setError(null);
    try {
      await updateStaffUser(user.id, { roleId, active });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleResetPassword(user: AdminStaffUser, newPassword: string) {
    setError(null);
    try {
      await resetStaffPassword(user.id, newPassword);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
      throw err;
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Équipe</h1>
      <p className="text-sm text-muted-foreground mb-5">Comptes ayant accès au Back-Office.</p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Ajouter un membre</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label>Nom</Label>
              <Input name="name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Mot de passe initial</Label>
              <Input name="password" type="password" minLength={8} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <select name="roleId" required className="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option value="">—</option>
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={creating}><Plus className="size-4" /> Ajouter</Button>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Actif</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff?.map((s) => (
              <StaffRow
                key={s.id}
                user={s}
                roles={roles ?? []}
                isSelf={s.id === currentUser?.id}
                onSave={handleUpdate}
                onResetPassword={handleResetPassword}
              />
            ))}
          </tbody>
        </table>
        {!staff && <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>}
      </div>
    </div>
  );
}

function StaffRow({
  user,
  roles,
  isSelf,
  onSave,
  onResetPassword,
}: {
  user: AdminStaffUser;
  roles: AdminRole[];
  isSelf: boolean;
  onSave: (user: AdminStaffUser, roleId: string, active: boolean) => Promise<void>;
  onResetPassword: (user: AdminStaffUser, newPassword: string) => Promise<void>;
}) {
  const [roleId, setRoleId] = useState(user.role.id);
  const [active, setActive] = useState(user.active);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(user, roleId, active);
    setSaving(false);
  }

  async function doReset() {
    if (newPassword.length < 8) return;
    setResetting(true);
    try {
      await onResetPassword(user, newPassword);
      setNewPassword("");
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2000);
    } catch {
      // erreur déjà affichée par le parent
    } finally {
      setResetting(false);
    }
  }

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-4 py-2.5 font-medium">{user.name}{isSelf && <span className="text-xs text-muted-foreground ml-1">(vous)</span>}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{user.email}</td>
      <td className="px-4 py-2.5">
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2.5">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={isSelf} className="size-4" />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
          <div className="flex items-center gap-1.5">
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="Nouveau mot de passe"
              minLength={8}
              className="w-40 h-8 text-xs"
            />
            <Button size="sm" variant="ghost" onClick={doReset} disabled={resetting || newPassword.length < 8} aria-label="Réinitialiser le mot de passe">
              <KeyRound className="size-3.5" />
            </Button>
          </div>
          {resetDone && <p className="text-xs text-brand-success">Mot de passe changé ✓</p>}
        </div>
      </td>
    </tr>
  );
}

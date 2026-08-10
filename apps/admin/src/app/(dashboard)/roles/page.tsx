"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listRoles,
  listPermissionOptions,
  createRole,
  updateRole,
  removeRole,
  type AdminRole,
  type PermissionOption,
} from "@/lib/staff-users";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<Set<string>>(new Set());

  function refresh() {
    listRoles().then(setRoles);
    listPermissionOptions().then(setPermissions);
  }
  useEffect(refresh, []);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await createRole({ code: newCode.toUpperCase().replace(/[^A-Z0-9_]/g, "_"), name: newName, permissionCodes: [...newPerms] });
      setNewCode("");
      setNewName("");
      setNewPerms(new Set());
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setCreating(false);
    }
  }

  async function handleRemove(id: string) {
    setError(null);
    try {
      await removeRole(id);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleSave(role: AdminRole, name: string, permissionCodes: string[]) {
    setError(null);
    try {
      await updateRole(role.id, { name, permissionCodes });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  const domains = permissions ? [...new Set(permissions.map((p) => p.domain))] : [];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Rôles &amp; permissions</h1>
      <p className="text-sm text-muted-foreground mb-5">Chaque rôle regroupe un ensemble de permissions, assignées aux membres du staff dans Équipe.</p>

      <Card className="mb-5">
        <CardHeader><CardTitle>Créer un rôle</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Nom affiché</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="ex: Responsable Livraison" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Code (identifiant technique)</Label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} required placeholder="ex: SHIPPING_MANAGER" />
              </div>
            </div>
            <PermissionPicker domains={domains} permissions={permissions ?? []} selected={newPerms} onChange={setNewPerms} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={creating} className="w-fit"><Plus className="size-4" /> Créer le rôle</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3.5">
        {roles?.map((r) => (
          <RoleCard key={r.id} role={r} domains={domains} permissions={permissions ?? []} onSave={handleSave} onRemove={handleRemove} />
        ))}
        {!roles && <p className="text-sm text-muted-foreground">Chargement…</p>}
      </div>
    </div>
  );
}

function RoleCard({
  role,
  domains,
  permissions,
  onSave,
  onRemove,
}: {
  role: AdminRole;
  domains: string[];
  permissions: PermissionOption[];
  onSave: (role: AdminRole, name: string, permissionCodes: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(role.name);
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions.map((p) => p.permission.code)));
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isSuperAdmin = role.code === "SUPER_ADMIN";

  async function save() {
    setSaving(true);
    await onSave(role, name, [...selected]);
    setSaving(false);
  }

  async function remove() {
    if (removing) return;
    setRemoving(true);
    await onRemove(role.id);
    setRemoving(false);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center justify-between w-full text-left">
          <div>
            <p className="font-bold text-sm">{role.name} <span className="text-xs font-normal text-muted-foreground ml-1">({role.code})</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{role.permissions.length} permission(s) · {role._count.staffUsers} membre(s)</p>
          </div>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="mt-3.5 pt-3.5 border-t border-border flex flex-col gap-3.5">
            {isSuperAdmin ? (
              <p className="text-xs text-muted-foreground rounded-lg bg-secondary p-2.5">
                Le rôle Super Administrateur a toujours accès à tout, quelles que soient les permissions listées ici.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 max-w-sm">
                <Label>Nom affiché</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <PermissionPicker domains={domains} permissions={permissions} selected={selected} onChange={setSelected} disabled={isSuperAdmin} />
            <div className="flex items-center gap-2">
              {!isSuperAdmin && (
                <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
              )}
              {!isSuperAdmin && role._count.staffUsers === 0 && (
                <Button size="sm" variant="ghost" onClick={remove} disabled={removing} aria-label="Supprimer le rôle">
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PermissionPicker({
  domains,
  permissions,
  selected,
  onChange,
  disabled,
}: {
  domains: string[];
  permissions: PermissionOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  function toggle(code: string) {
    if (disabled) return;
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChange(next);
  }

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {domains.map((domain) => (
        <div key={domain} className="rounded-lg border border-border p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">{domain}</p>
          <div className="flex flex-col gap-1">
            {permissions.filter((p) => p.domain === domain).map((p) => (
              <label key={p.code} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={selected.has(p.code)} onChange={() => toggle(p.code)} disabled={disabled} className="size-3.5" />
                {p.code}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

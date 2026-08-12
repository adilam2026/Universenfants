"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "@/lib/auth-client";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

const STEPS = [
  { status: "PENDING", key: "created" },
  { status: "CONFIRMED", key: "confirmed" },
  { status: "PREPARING", key: "preparing" },
  { status: "SHIPPED", key: "shipped" },
  { status: "DELIVERED", key: "delivered" },
];

// Extrait de compte/commandes/[id] (page client authentifiée) pour être
// réutilisé tel quel par le suivi invité (OTP) : même rendu, deux sources
// de données différentes (session client vs jeton de suivi à usage
// restreint). Ne contient volontairement aucune action de gestion
// (annulation...) — réservée à l'espace client, voir le commentaire sur
// OrderTrackingService côté API.
export function OrderDetailView({ order }: { order: OrderDetail }) {
  const t = useTranslations("orders");
  const currentIdx = order.status === "CANCELLED" ? -1 : STEPS.findIndex((s) => s.status === order.status);

  return (
    <>
      {order.status !== "CANCELLED" && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <h3 className="font-bold mb-4">{t("tracking")}</h3>
          <div className="flex justify-between gap-1">
            {STEPS.map((s, i) => (
              <div key={s.status} className="flex flex-col items-center gap-1.5 flex-1 px-0.5">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                    i <= currentIdx ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i <= currentIdx ? <Check className="size-3.5" /> : i + 1}
                </div>
                <span className="text-[11px] text-center font-bold">{t(`steps.${s.key}` as never)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <h3 className="font-bold mb-3.5">{t("products")}</h3>
        <div className="flex flex-col gap-2">
          {order.lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm">
              <span>{l.productNameSnapshot} × {l.quantity}</span>
              <span className="font-bold">{dh(l.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 text-sm pt-3 mt-3 border-t border-border">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("subtotal")}</span>
            <span>{dh(order.subtotal)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-brand-success">
              <span>{t("discount")}</span>
              <span>-{dh(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>{t("shipping")}</span>
            <span>{Number(order.shippingFee) === 0 ? t("free") : dh(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between font-extrabold text-lg pt-2 border-t border-border">
            <span>{t("totalTtc")}</span>
            <span>{dh(order.total)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            {t("vatIncluded", { rate: Math.round(Number(order.vatRate) * 100), amount: dh(order.vatAmount) })}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t("shippingInfo", { address: order.shippingAddress, city: order.shippingCity, phone: order.shippingPhone })}
      </div>
    </>
  );
}

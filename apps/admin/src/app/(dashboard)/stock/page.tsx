"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listStockMovements, getStockValuation, type StockMovementEntry, type StockValuation } from "@/lib/products";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

const REASON_LABEL: Record<string, string> = {
  SUPPLIER_RECEIPT: "Réception fournisseur",
  INVENTORY_CORRECTION: "Correction d'inventaire",
  ORDER_CANCELLATION: "Annulation commande",
  ORDER_DELIVERED_DEDUCTION: "Livraison (déduction)",
  RETURN: "Retour",
  RESERVATION: "Réservation",
  RESERVATION_RELEASE: "Libération réservation",
};

export default function StockPage() {
  const [tab, setTab] = useState<"movements" | "valuation">("movements");
  const [movements, setMovements] = useState<{ items: StockMovementEntry[]; page: number; totalPages: number } | null>(null);
  const [valuation, setValuation] = useState<StockValuation | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (tab === "movements") listStockMovements({ page }).then(setMovements);
  }, [tab, page]);

  useEffect(() => {
    if (tab === "valuation" && !valuation) getStockValuation().then(setValuation);
  }, [tab, valuation]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Stock</h1>
      <p className="text-sm text-muted-foreground mb-5">Historique des mouvements et valorisation du stock immobilisé.</p>

      <div className="flex gap-2 mb-5">
        <Button variant={tab === "movements" ? "default" : "outline"} size="sm" onClick={() => setTab("movements")}>Historique</Button>
        <Button variant={tab === "valuation" ? "default" : "outline"} size="sm" onClick={() => setTab("valuation")}>Valorisation</Button>
      </div>

      {tab === "movements" && (
        <Card>
          <CardHeader><CardTitle>Mouvements de stock</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!movements ? (
              <p className="text-sm text-muted-foreground text-center py-10">Chargement…</p>
            ) : movements.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Aucun mouvement enregistré.</p>
            ) : (
              <div className="divide-y divide-border">
                {movements.items.map((m) => (
                  <div key={m.id} className="px-5 py-3 text-sm flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{m.product.nameFr}{m.variant ? ` — ${m.variant.label}` : ""} <span className="text-muted-foreground font-normal">({m.variant?.sku ?? m.product.sku})</span></p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {REASON_LABEL[m.reason] ?? m.reason}
                        {m.order && ` · Commande ${m.order.orderNumber}`}
                        {m.staffUser && ` · ${m.staffUser.name}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums">
                        {m.previousStock} → {m.newStock}
                        <span className={m.newStock > m.previousStock ? "text-brand-success ml-1.5" : "text-destructive ml-1.5"}>
                          ({m.newStock > m.previousStock ? "+" : ""}{m.newStock - m.previousStock})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {movements && movements.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 p-3 border-t border-border">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
              <span className="text-xs text-muted-foreground">Page {movements.page} / {movements.totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= movements.totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          )}
        </Card>
      )}

      {tab === "valuation" && (
        <>
          {!valuation ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3.5 mb-5">
                <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Valeur totale du stock</p><p className="text-2xl font-bold mt-1">{dh(valuation.totalValue)}</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground font-medium">Unités en stock</p><p className="text-2xl font-bold mt-1">{valuation.totalUnits}</p></CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle>Détail par produit (200 plus élevés)</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {valuation.lines.map((l) => (
                      <div key={`${l.productId}-${l.sku}`} className="px-5 py-2.5 text-sm flex justify-between">
                        <span>{l.name} <span className="text-muted-foreground">({l.sku})</span> × {l.stock}</span>
                        <span className="font-bold">{dh(l.value)}</span>
                      </div>
                    ))}
                    {valuation.lines.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Aucun stock valorisé.</p>}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import { Star, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton";
import { listReviews, moderateReview, type AdminReview } from "@/lib/reviews";
import { ApiError } from "@/lib/api-client";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};
const STATUS_VARIANT: Record<string, "default" | "primary" | "success" | "destructive"> = {
  PENDING: "default",
  APPROVED: "success",
  REJECTED: "destructive",
};

export default function ReviewsPage() {
  const [filter, setFilter] = useState("PENDING");
  const [error, setError] = useState<string | null>(null);
  // La clé SWR inclut le filtre : changer de filtre lit/alimente une entrée
  // de cache distincte, et SWR ignore nativement toute réponse devenue
  // obsolète si le filtre a de nouveau changé entre-temps.
  const { data: reviews, mutate: refresh } = useSWR<AdminReview[]>(
    `/reviews/admin${filter ? `?status=${filter}` : ""}`,
    () => listReviews(filter || undefined),
  );

  async function handleModerate(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    try {
      await moderateReview(id, status);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Avis clients</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-border px-3 py-1.5 text-sm bg-card"
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Rejeté</option>
        </select>
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      {!reviews ? (
        <CardSkeleton lines={4} />
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun avis pour ce filtre.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{r.product.nameFr}</span>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-0.5 text-brand-highlight mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5" fill={i < r.rating ? "currentColor" : "none"} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-foreground/90">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {r.customer.firstName} {r.customer.lastName} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {r.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleModerate(r.id, "APPROVED")}>
                      <Check className="size-4" /> Approuver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleModerate(r.id, "REJECTED")}>
                      <X className="size-4" /> Rejeter
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
